create extension if not exists pgcrypto with schema extensions;

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  category text not null
    check (category in ('coding', 'technical', 'behavioral', 'english', 'other')),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  priority text not null default 'medium'
    check (priority in ('high', 'medium', 'low')),
  description text,
  memo text,
  status text not null default 'todo'
    check (status in ('todo', 'doing', 'done')),
  position integer not null default 0 check (position >= 0),
  review_of_task_id uuid references public.tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  deleted_at timestamptz
);

create table public.task_completion_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete restrict,
  completed_at timestamptz not null default now()
);

create table public.app_settings (
  id integer primary key default 1 check (id = 1),
  visa_expiry_date date,
  timezone text not null default 'America/Vancouver',
  updated_at timestamptz not null default now()
);

create index tasks_status_position_idx
  on public.tasks(status, position)
  where deleted_at is null;
create index tasks_category_idx on public.tasks(category) where deleted_at is null;
create index tasks_priority_idx on public.tasks(priority) where deleted_at is null;
create index tasks_deleted_at_idx on public.tasks(deleted_at);
create index task_completion_events_completed_at_idx
  on public.task_completion_events(completed_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create trigger app_settings_set_updated_at
before update on public.app_settings
for each row execute function public.set_updated_at();

insert into public.app_settings (id, visa_expiry_date, timezone)
values (1, null, 'America/Vancouver')
on conflict (id) do nothing;

-- Keeps a move, its completion event, and the visible column ordering in one transaction.
create or replace function public.move_task(
  p_task_id uuid,
  p_target_status text,
  p_column_orders jsonb
)
returns setof public.tasks
language plpgsql
set search_path = ''
as $$
declare
  v_old_status text;
  v_completed_at timestamptz;
  v_status text;
begin
  if p_target_status not in ('todo', 'doing', 'done') then
    raise exception 'Invalid task status';
  end if;

  if jsonb_typeof(p_column_orders) is distinct from 'object' then
    raise exception 'Invalid column ordering';
  end if;

  select status
    into v_old_status
    from public.tasks
    where id = p_task_id and deleted_at is null
    for update;

  if not found then
    raise exception 'Task not found';
  end if;

  if v_old_status <> 'done' and p_target_status = 'done' then
    v_completed_at := clock_timestamp();
    update public.tasks
      set status = p_target_status, completed_at = v_completed_at
      where id = p_task_id;
    insert into public.task_completion_events(task_id, completed_at)
      values (p_task_id, v_completed_at);
  elsif v_old_status = 'done' and p_target_status <> 'done' then
    update public.tasks
      set status = p_target_status, completed_at = null
      where id = p_task_id;
  else
    update public.tasks
      set status = p_target_status
      where id = p_task_id;
  end if;

  foreach v_status in array array['todo', 'doing', 'done'] loop
    if jsonb_typeof(p_column_orders -> v_status) = 'array' then
      with ordered as (
        select value::uuid as id, ordinality::integer - 1 as position
        from jsonb_array_elements_text(p_column_orders -> v_status)
          with ordinality as entries(value, ordinality)
      )
      update public.tasks as task
        set position = ordered.position
        from ordered
        where task.id = ordered.id
          and task.status = v_status
          and task.deleted_at is null;
    end if;
  end loop;

  return query select * from public.tasks where id = p_task_id;
end;
$$;

-- If today has no completion yet, the streak is anchored to yesterday.
create or replace function public.get_current_streak(p_timezone text)
returns integer
language sql
stable
set search_path = ''
as $$
  with local_days as (
    select distinct (completed_at at time zone p_timezone)::date as completed_day
    from public.task_completion_events
  ),
  anchor as (
    select case
      when exists (
        select 1 from local_days
        where completed_day = (current_timestamp at time zone p_timezone)::date
      ) then (current_timestamp at time zone p_timezone)::date
      else (current_timestamp at time zone p_timezone)::date - 1
    end as start_day
  ),
  ranked as (
    select
      completed_day,
      row_number() over (order by completed_day desc) as sequence_number
    from local_days, anchor
    where completed_day <= anchor.start_day
  )
  select count(*)::integer
  from ranked, anchor
  where ranked.completed_day = anchor.start_day - (ranked.sequence_number::integer - 1);
$$;

alter table public.tasks enable row level security;
alter table public.task_completion_events enable row level security;
alter table public.app_settings enable row level security;

-- Intentionally no anon/authenticated policies. Only the server-side service role is used.
revoke all on table public.tasks from anon, authenticated;
revoke all on table public.task_completion_events from anon, authenticated;
revoke all on table public.app_settings from anon, authenticated;
revoke all on table public.tasks from service_role;
revoke all on table public.task_completion_events from service_role;
revoke all on table public.app_settings from service_role;
grant usage on schema public to service_role;
grant select, insert, update on table public.tasks to service_role;
grant select, insert on table public.task_completion_events to service_role;
grant select, update on table public.app_settings to service_role;
revoke execute on function public.move_task(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.get_current_streak(text) from public, anon, authenticated;
grant execute on function public.move_task(uuid, text, jsonb) to service_role;
grant execute on function public.get_current_streak(text) to service_role;
