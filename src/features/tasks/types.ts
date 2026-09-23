export const TASK_CATEGORIES = [
  "coding",
  "technical",
  "behavioral",
  "english",
  "other",
] as const;

export const TASK_PRIORITIES = ["high", "medium", "low"] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export type Task = {
  id: string;
  category: TaskCategory;
  title: string;
  priority: TaskPriority;
  description: string | null;
  memo: string | null;
  is_completed: boolean;
  position: number;
  is_daily: boolean;
  scheduled_for: string | null;
  selected_at: string | null;
  review_of_task_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  deleted_at: string | null;
};

export type TaskDraft = Pick<
  Task,
  "category" | "title" | "priority" | "description" | "memo" | "is_daily"
> & { is_today: boolean };

export const categoryLabels: Record<TaskCategory, string> = {
  coding: "Coding",
  technical: "Technical",
  behavioral: "Behavioral",
  english: "English",
  other: "Other",
};

export const priorityLabels: Record<TaskPriority, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

export const priorityCardLabels: Record<TaskPriority, string> = {
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
};
