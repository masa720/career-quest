alter table public.tasks
  add column is_completed boolean not null default false;

update public.tasks
set is_completed = (status = 'done');

create index tasks_completion_position_idx
  on public.tasks(is_completed, position)
  where deleted_at is null;

create or replace function public.set_task_completion(
  p_task_id uuid,
  p_is_completed boolean
)
returns setof public.tasks
language plpgsql
set search_path = ''
as $$
declare
  v_was_completed boolean;
  v_completed_at timestamptz;
begin
  select is_completed
    into v_was_completed
    from public.tasks
    where id = p_task_id and deleted_at is null
    for update;

  if not found then
    raise exception 'Task not found';
  end if;

  if not v_was_completed and p_is_completed then
    v_completed_at := clock_timestamp();
    update public.tasks
      set is_completed = true, completed_at = v_completed_at
      where id = p_task_id;
    insert into public.task_completion_events(task_id, completed_at)
      values (p_task_id, v_completed_at);
  elsif v_was_completed and not p_is_completed then
    update public.tasks
      set is_completed = false, completed_at = null
      where id = p_task_id;
  end if;

  return query select * from public.tasks where id = p_task_id;
end;
$$;

create or replace function public.rollover_daily_tasks()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_timezone text;
  v_updated_count integer;
begin
  select coalesce(
    (select timezone from public.app_settings where id = 1),
    'America/Vancouver'
  ) into v_timezone;

  update public.tasks
    set is_completed = false, completed_at = null
    where is_daily = true
      and is_completed = true
      and completed_at is not null
      and deleted_at is null
      and (completed_at at time zone v_timezone)::date
        < (current_timestamp at time zone v_timezone)::date;

  get diagnostics v_updated_count = row_count;
  return v_updated_count;
end;
$$;

revoke execute on function public.set_task_completion(uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.set_task_completion(uuid, boolean)
  to service_role;

drop function public.move_task(uuid, text, jsonb);
drop index public.tasks_status_position_idx;
drop index public.tasks_daily_status_idx;
alter table public.tasks drop column status;
