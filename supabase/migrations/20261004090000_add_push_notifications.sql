create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

alter table public.app_settings
  add column notifications_enabled boolean not null default false,
  add column morning_notification_time time not null default '08:30',
  add column evening_notification_time time not null default '20:30',
  add column notification_function_url text,
  add column notification_cron_secret text not null
    default encode(extensions.gen_random_bytes(32), 'hex');

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null
    references public.push_subscriptions(id) on delete cascade,
  notification_type text not null
    check (notification_type in ('morning', 'evening', 'test')),
  local_date date,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed')),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  unique nulls not distinct (subscription_id, notification_type, local_date)
);

create index push_subscriptions_active_idx
  on public.push_subscriptions(user_id)
  where revoked_at is null;

create index notification_deliveries_created_idx
  on public.notification_deliveries(created_at desc);

create trigger push_subscriptions_set_updated_at
before update on public.push_subscriptions
for each row execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;
alter table public.notification_deliveries enable row level security;

revoke all on table public.push_subscriptions from anon, authenticated;
revoke all on table public.notification_deliveries from anon, authenticated;
revoke all on table public.push_subscriptions from service_role;
revoke all on table public.notification_deliveries from service_role;
grant select, insert, update, delete on table public.push_subscriptions to service_role;
grant select, insert, update on table public.notification_deliveries to service_role;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'careerquest-push-reminders';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end;
$$;

select cron.schedule(
  'careerquest-push-reminders',
  '*/5 * * * *',
  $job$
    select net.http_post(
      url := notification_function_url,
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'mode', 'scheduled',
        'cron_secret', notification_cron_secret
      ),
      timeout_milliseconds := 10000
    )
    from public.app_settings
    where id = 1
      and notifications_enabled = true
      and notification_function_url is not null;
  $job$
);
