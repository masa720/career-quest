import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Task, TaskDraft } from "@/features/tasks/types";

function cleanOptionalText(value: string | null) {
  return value?.trim() || null;
}

export async function createTask(input: TaskDraft): Promise<Task> {
  const supabase = await createServerSupabaseClient();
  const { data: lastTask, error: positionError } = await supabase
    .from("tasks")
    .select("position")
    .eq("is_completed", false)
    .is("deleted_at", null)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (positionError) throw new Error("タスクの並び順を取得できませんでした。");

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      ...input,
      title: input.title.trim(),
      description: cleanOptionalText(input.description),
      memo: cleanOptionalText(input.memo),
      is_completed: false,
      position: (lastTask?.position ?? -1) + 1,
    })
    .select()
    .single();

  if (error) {
    console.error("createTask", error);
    throw new Error("タスクを作成できませんでした。");
  }

  return data;
}

export async function setTaskCompletion(
  taskId: string,
  isCompleted: boolean,
): Promise<Task> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("set_task_completion", {
    p_task_id: taskId,
    p_is_completed: isCompleted,
  });

  if (error || !data?.[0]) {
    console.error("setTaskCompletion", error);
    throw new Error("完了状態を更新できませんでした。");
  }

  return data[0];
}

export async function updateTask(
  input: TaskDraft & { id: string; is_completed: boolean },
): Promise<Task> {
  const supabase = await createServerSupabaseClient();
  const { data: current, error: currentError } = await supabase
    .from("tasks")
    .select("is_completed")
    .eq("id", input.id)
    .is("deleted_at", null)
    .single();

  if (currentError || !current) throw new Error("タスクが見つかりません。");

  const { data, error } = await supabase
    .from("tasks")
    .update({
      category: input.category,
      title: input.title.trim(),
      priority: input.priority,
      description: cleanOptionalText(input.description),
      memo: cleanOptionalText(input.memo),
      is_daily: input.is_daily,
    })
    .eq("id", input.id)
    .is("deleted_at", null)
    .select()
    .single();

  if (error) {
    console.error("updateTask", error);
    throw new Error("タスクを更新できませんでした。");
  }

  if (current.is_completed === input.is_completed) return data;

  const moved = await setTaskCompletion(input.id, input.is_completed);
  return { ...data, ...moved };
}

export async function deleteTask(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("tasks")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) {
    console.error("deleteTask", error);
    throw new Error("タスクを削除できませんでした。");
  }
}

export async function createReviewTask(id: string): Promise<Task> {
  const supabase = await createServerSupabaseClient();
  const { data: original, error: originalError } = await supabase
    .from("tasks")
    .select("category, title, priority, description")
    .eq("id", id)
    .eq("is_completed", true)
    .is("deleted_at", null)
    .single();

  if (originalError || !original) {
    throw new Error("完了済みのタスクが見つかりません。");
  }

  const { data: lastTask, error: positionError } = await supabase
    .from("tasks")
    .select("position")
    .eq("is_completed", false)
    .is("deleted_at", null)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (positionError) throw new Error("タスクの並び順を取得できませんでした。");

  const reviewPrefix = "【復習】";
  const baseTitle = original.title.replace(/^【復習】\s*/, "");
  const reviewTitle = `${reviewPrefix}${baseTitle.slice(0, 200 - reviewPrefix.length)}`;

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      ...original,
      title: reviewTitle,
      memo: null,
      is_completed: false,
      is_daily: false,
      completed_at: null,
      review_of_task_id: id,
      position: (lastTask?.position ?? -1) + 1,
    })
    .select()
    .single();

  if (error) {
    console.error("createReviewTask", error);
    throw new Error("復習タスクを作成できませんでした。");
  }

  return data;
}
