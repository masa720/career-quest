import "server-only";

import type { Task, TaskStatus } from "@/features/tasks/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const activeTaskColumns =
  "id, category, title, priority, description, memo, status, position, review_of_task_id, created_at, updated_at, completed_at, deleted_at";

function throwDatabaseError(message: string, cause: { message: string } | null) {
  if (cause) {
    console.error(message, cause);
    throw new Error(message);
  }
}

export async function getTasks(): Promise<Task[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(activeTaskColumns)
    .is("deleted_at", null)
    .order("status")
    .order("position")
    .order("created_at");

  throwDatabaseError("タスクを取得できませんでした。", error);
  return data ?? [];
}

export async function getPriorityTasks(): Promise<Task[]> {
  const tasks = await getTasks();
  const statusRank: Record<TaskStatus, number> = {
    doing: 0,
    todo: 1,
    done: 2,
  };
  const priorityRank = { high: 0, medium: 1, low: 2 } as const;

  return tasks
    .filter((task) => task.status !== "done")
    .sort(
      (a, b) =>
        statusRank[a.status] - statusRank[b.status] ||
        priorityRank[a.priority] - priorityRank[b.priority] ||
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )
    .slice(0, 3);
}

export async function getCurrentStreak(timezone: string): Promise<number> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_current_streak", {
    p_timezone: timezone,
  });

  throwDatabaseError("ストリークを取得できませんでした。", error);
  return data ?? 0;
}
