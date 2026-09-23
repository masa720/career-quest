"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { Task } from "@/features/tasks/types";
import {
  createReviewTask,
  createTask,
  deleteTask,
  moveTask,
  updateTask,
} from "@/server/tasks/mutations";
import {
  createTaskSchema,
  moveTaskSchema,
  taskIdSchema,
  updateTaskSchema,
} from "@/server/tasks/schemas";
import { updateSettings } from "@/server/settings/mutations";

export type CreateTaskState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export type MutationResult =
  | { ok: true; task?: Task }
  | { ok: false; error: string };

const formText = (formData: FormData, name: string) =>
  String(formData.get(name) ?? "");

export async function createTaskAction(
  _previousState: CreateTaskState,
  formData: FormData,
): Promise<CreateTaskState> {
  const parsed = createTaskSchema.safeParse({
    category: formText(formData, "category"),
    title: formText(formData, "title"),
    priority: formText(formData, "priority"),
    description: formText(formData, "description"),
    memo: formText(formData, "memo"),
  });

  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  try {
    await createTask(parsed.data);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "保存に失敗しました。",
    };
  }

  revalidatePath("/");
  revalidatePath("/tasks");
  redirect("/tasks?notice=created");
}

export async function moveTaskAction(input: unknown): Promise<MutationResult> {
  const parsed = moveTaskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "並び順が正しくありません。" };

  try {
    const task = await moveTask(
      parsed.data.taskId,
      parsed.data.targetStatus,
      parsed.data.columnOrders,
    );
    revalidatePath("/");
    revalidatePath("/tasks");
    return { ok: true, task };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "移動に失敗しました。",
    };
  }
}

export async function updateTaskAction(input: unknown): Promise<MutationResult> {
  const parsed = updateTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "入力内容を確認してください。" };
  }

  try {
    const task = await updateTask(parsed.data);
    revalidatePath("/");
    revalidatePath("/tasks");
    return { ok: true, task };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "更新に失敗しました。",
    };
  }
}

export async function deleteTaskAction(input: unknown): Promise<MutationResult> {
  const parsed = taskIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "タスクIDが正しくありません。" };

  try {
    await deleteTask(parsed.data);
    revalidatePath("/");
    revalidatePath("/tasks");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "削除に失敗しました。",
    };
  }
}

export async function createReviewTaskAction(
  input: unknown,
): Promise<MutationResult> {
  const parsed = taskIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "タスクIDが正しくありません。" };

  try {
    const task = await createReviewTask(parsed.data);
    revalidatePath("/");
    revalidatePath("/tasks");
    return { ok: true, task };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "復習タスクの追加に失敗しました。",
    };
  }
}

export async function updateSettingsAction(formData: FormData) {
  const value = formText(formData, "visa_expiry_date");
  const parsed = z.union([z.iso.date(), z.literal("")]).safeParse(value);
  if (!parsed.success) redirect("/?notice=invalid-date");

  try {
    await updateSettings(parsed.data || null);
  } catch {
    redirect("/?notice=settings-error");
  }

  revalidatePath("/");
  redirect("/?notice=settings-updated");
}
