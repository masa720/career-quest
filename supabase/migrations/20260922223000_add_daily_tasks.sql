alter table public.tasks
  add column is_daily boolean not null default false;

create index tasks_daily_status_idx
  on public.tasks(is_daily, status)
  where deleted_at is null and is_daily = true;

-- Reopens daily tasks on the first request of a new local calendar day.
-- Completion events stay untouched so streak history remains accurate.
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

  with candidates as (
    select
      id,
      row_number() over (order by completed_at, created_at, id)::integer as new_offset
    from public.tasks
    where is_daily = true
      and status = 'done'
      and completed_at is not null
      and deleted_at is null
      and (completed_at at time zone v_timezone)::date
        < (current_timestamp at time zone v_timezone)::date
  ),
  todo_tail as (
    select coalesce(max(position), -1) as last_position
    from public.tasks
    where status = 'todo' and deleted_at is null
  )
  update public.tasks as task
    set
      status = 'todo',
      completed_at = null,
      position = todo_tail.last_position + candidates.new_offset
    from candidates, todo_tail
    where task.id = candidates.id;

  get diagnostics v_updated_count = row_count;
  return v_updated_count;
end;
$$;

revoke execute on function public.rollover_daily_tasks() from public, anon, authenticated;
grant execute on function public.rollover_daily_tasks() to service_role;
