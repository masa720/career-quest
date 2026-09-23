import { z } from "zod";

import {
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  TASK_STATUSES,
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
});

export const updateTaskSchema = createTaskSchema.extend({
  id: z.uuid(),
  status: z.enum(TASK_STATUSES),
});

export const moveTaskSchema = z.object({
  taskId: z.uuid(),
  targetStatus: z.enum(TASK_STATUSES),
  columnOrders: z.object({
    todo: z.array(z.uuid()),
    doing: z.array(z.uuid()),
    done: z.array(z.uuid()),
  }),
});

export const taskIdSchema = z.uuid();
