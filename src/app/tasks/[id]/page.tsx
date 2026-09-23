import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  Pencil,
  Repeat2,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  categoryLabels,
  priorityCardLabels,
} from "@/features/tasks/types";
import { getTask } from "@/server/tasks/queries";

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Vancouver",
  }).format(new Date(value));
}

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const task = await getTask(id);
  if (!task) notFound();

  const StatusIcon = task.is_completed ? CheckCircle2 : CircleDashed;

  return (
    <div className="task-detail-page">
      <Link href="/tasks" className="task-detail-back">
        <ArrowLeft size={17} aria-hidden="true" />
        タスク一覧へ
      </Link>

      <article className="task-detail-card">
        <header className="task-detail-header">
          <div className="task-detail-badges">
            <span className={`priority-badge priority-${task.priority}`}>
              {priorityCardLabels[task.priority]}
            </span>
            <span className="task-detail-category">
              {categoryLabels[task.category]}
            </span>
            {task.is_daily && (
              <span className="daily-badge">
                <Repeat2 size={12} aria-hidden="true" /> 毎日
              </span>
            )}
          </div>
          <Link href={`/tasks?task=${task.id}`} className="button task-detail-edit">
            <Pencil size={16} aria-hidden="true" />
            編集する
          </Link>
        </header>

        <h1>{task.title}</h1>

        <div className="task-detail-status">
          <StatusIcon size={19} aria-hidden="true" />
          <span>ステータス</span>
          <strong>{task.is_completed ? "完了" : "未着手"}</strong>
        </div>

        <section className="task-detail-section">
          <h2>📝 詳細</h2>
          <p className={!task.description ? "is-empty" : undefined}>
            {task.description || "詳細は登録されていません。"}
          </p>
        </section>

        <section className="task-detail-section">
          <h2>💭 メモ</h2>
          <p className={!task.memo ? "is-empty" : undefined}>
            {task.memo || "メモは登録されていません。"}
          </p>
        </section>

        <footer className="task-detail-dates">
          <CalendarClock size={18} aria-hidden="true" />
          <dl>
            <div><dt>作成</dt><dd>{formatDate(task.created_at)}</dd></div>
            <div><dt>更新</dt><dd>{formatDate(task.updated_at)}</dd></div>
            {task.completed_at && (
              <div><dt>完了</dt><dd>{formatDate(task.completed_at)}</dd></div>
            )}
          </dl>
        </footer>
      </article>
    </div>
  );
}
