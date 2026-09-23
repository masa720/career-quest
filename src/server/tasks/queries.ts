import "server-only";

import type { Task } from "@/features/tasks/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const activeTaskColumns =
  "id, category, title, priority, description, memo, is_completed, position, is_daily, scheduled_for, selected_at, review_of_task_id, created_at, updated_at, completed_at, deleted_at";

function throwDatabaseError(message: string, cause: { message: string } | null) {
  if (cause) {
    console.error(message, cause);
    throw new Error(message);
  }
}

export async function getTasks(): Promise<Task[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(activeTaskColumns)
    .is("deleted_at", null)
    .order("is_completed")
    .order("position")
    .order("created_at");

  throwDatabaseError("タスクを取得できませんでした。", error);
  return data ?? [];
}

export async function getTask(id: string): Promise<Task | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(activeTaskColumns)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  throwDatabaseError("タスクを取得できませんでした。", error);
  return data;
}

export async function rolloverDailyTasks(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("rollover_daily_tasks");
  throwDatabaseError("繰り返しタスクを更新できませんでした。", error);
}

export async function getDailyTasks(): Promise<Task[]> {
  const tasks = await getTasks();
  return tasks
    .filter((task) => task.is_daily)
    .sort(
      (a, b) =>
        Number(a.is_completed) - Number(b.is_completed) ||
        a.position - b.position,
    );
}

export async function getTodayTasks(
  timezone = "America/Vancouver",
): Promise<Task[]> {
  const tasks = await getTasks();
  const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const today = dateFormatter.format(new Date());
  const nonDailyTasks = tasks.filter((task) => !task.is_daily);
  const activeTasks = nonDailyTasks
    .filter(
      (task) =>
        !task.is_completed &&
        task.scheduled_for !== null &&
        task.scheduled_for <= today,
    )
    .sort(
      (a, b) =>
        (a.scheduled_for ?? "").localeCompare(b.scheduled_for ?? "") ||
        new Date(a.selected_at ?? a.created_at).getTime() -
          new Date(b.selected_at ?? b.created_at).getTime(),
    );
  const completedToday = nonDailyTasks
    .filter(
      (task) =>
        task.is_completed &&
        task.scheduled_for !== null &&
        task.completed_at !== null &&
        dateFormatter.format(new Date(task.completed_at)) === today,
    )
    .sort(
      (a, b) =>
        new Date(a.completed_at ?? 0).getTime() -
        new Date(b.completed_at ?? 0).getTime(),
    );

  return [...activeTasks, ...completedToday];
}

export async function getCurrentStreak(timezone: string): Promise<number> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_current_streak", {
    p_timezone: timezone,
  });

  throwDatabaseError("ストリークを取得できませんでした。", error);
  return data ?? 0;
}
