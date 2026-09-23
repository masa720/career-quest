import "server-only";

import type { Json } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Task, TaskDraft, TaskStatus } from "@/features/tasks/types";

type ColumnOrders = Record<TaskStatus, string[]>;

function cleanOptionalText(value: string | null) {
  return value?.trim() || null;
}

export async function createTask(input: TaskDraft): Promise<Task> {
  const supabase = await createServerSupabaseClient();
  const { data: lastTask, error: positionError } = await supabase
    .from("tasks")
    .select("position")
    .eq("status", "todo")
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
      status: "todo",
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

export async function moveTask(
  taskId: string,
  targetStatus: TaskStatus,
  columnOrders: ColumnOrders,
): Promise<Task> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("move_task", {
    p_task_id: taskId,
    p_target_status: targetStatus,
    p_column_orders: columnOrders as Json,
  });

  if (error || !data?.[0]) {
    console.error("moveTask", error);
    throw new Error("タスクを移動できませんでした。");
  }

  return data[0];
}

export async function completeTask(taskId: string): Promise<Task> {
  const supabase = await createServerSupabaseClient();
  const { data: allTasks, error } = await supabase
    .from("tasks")
    .select("id, status")
    .is("deleted_at", null)
    .order("position");

  if (error) throw new Error("タスクの並び順を取得できませんでした。");

  const target = allTasks?.find((task) => task.id === taskId);
  if (!target) throw new Error("タスクが見つかりません。");

  const columnOrders: ColumnOrders = { todo: [], doing: [], done: [] };
  for (const task of allTasks ?? []) {
    if (task.id !== taskId) columnOrders[task.status].push(task.id);
  }
  columnOrders.done.push(taskId);

  return moveTask(taskId, "done", columnOrders);
}

export async function updateTask(
  input: TaskDraft & { id: string; status: TaskStatus },
): Promise<Task> {
  const supabase = await createServerSupabaseClient();
  const { data: current, error: currentError } = await supabase
    .from("tasks")
    .select("status")
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

  if (current.status === input.status) return data;

  const { data: allTasks, error: orderError } = await supabase
    .from("tasks")
    .select("id, status")
    .is("deleted_at", null)
    .order("position");

  if (orderError) throw new Error("タスクの並び順を取得できませんでした。");

  const columnOrders: ColumnOrders = { todo: [], doing: [], done: [] };
  for (const task of allTasks ?? []) {
    if (task.id !== input.id) columnOrders[task.status].push(task.id);
  }
  columnOrders[input.status].push(input.id);

  const moved = await moveTask(input.id, input.status, columnOrders);
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
    .eq("status", "done")
    .is("deleted_at", null)
    .single();

  if (originalError || !original) {
    throw new Error("完了済みのタスクが見つかりません。");
  }

  const { data: lastTask, error: positionError } = await supabase
    .from("tasks")
    .select("position")
    .eq("status", "todo")
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
      status: "todo",
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
