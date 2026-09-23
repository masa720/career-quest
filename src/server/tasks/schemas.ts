import { z } from "zod";

import {
  TASK_CATEGORIES,
  TASK_PRIORITIES,
} from "@/features/tasks/types";

const optionalText = z
  .string()
  .trim()
  .max(5000, "5,000文字以内で入力してください")
  .transform((value) => value || null);

export const createTaskSchema = z.object({
  category: z.enum(TASK_CATEGORIES, "カテゴリを選択してください"),
  title: z
    .string()
    .trim()
    .min(1, "タイトルを入力してください")
    .max(200, "200文字以内で入力してください"),
  priority: z.enum(TASK_PRIORITIES, "優先度を選択してください"),
  description: optionalText,
  memo: optionalText,
  is_daily: z.boolean(),
  is_today: z.boolean(),
});

export const updateTaskSchema = createTaskSchema.extend({
  id: z.uuid(),
  is_completed: z.boolean(),
});

export const taskIdSchema = z.uuid();

export const taskCompletionSchema = z.object({
  id: z.uuid(),
  isCompleted: z.boolean(),
});

export const taskTodaySchema = z.object({
  id: z.uuid(),
  isToday: z.boolean(),
});
