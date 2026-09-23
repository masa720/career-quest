alter table public.tasks
  add column scheduled_for date,
  add column selected_at timestamptz;

create index tasks_scheduled_for_idx
  on public.tasks(scheduled_for, is_completed)
  where deleted_at is null and scheduled_for is not null;
