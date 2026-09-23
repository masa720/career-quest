"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { completeTaskAction } from "@/app/actions";

export function TaskCompleteButton({
  taskId,
  title,
  completed = false,
}: {
  taskId: string;
  title: string;
  completed?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function complete() {
    if (completed || isPending) return;
    setError(null);
    startTransition(async () => {
      const result = await completeTaskAction(taskId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      className={`task-complete-checkbox ${completed ? "is-checked" : ""}`}
      onClick={complete}
      disabled={completed || isPending}
      role="checkbox"
      aria-checked={completed}
      aria-label={completed ? `${title}は完了済み` : `${title}を完了にする`}
      aria-busy={isPending}
      title={error ?? (completed ? "完了済み" : "完了にする")}
    >
      {(completed || isPending) && <Check size={13} aria-hidden="true" />}
    </button>
  );
}
