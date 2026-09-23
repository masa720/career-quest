import { ArrowRight, CalendarDays, Flame, Pencil, Plus } from "lucide-react";
import Link from "next/link";

import { updateSettingsAction } from "@/app/actions";
import {
  categoryLabels,
  priorityCardLabels,
  type Task,
} from "@/features/tasks/types";
import { daysUntilDate, formatJapaneseDate } from "@/lib/date";
import { getSettings, type AppSettings } from "@/server/settings/queries";
import { getCurrentStreak, getPriorityTasks } from "@/server/tasks/queries";

export const dynamic = "force-dynamic";

const homeNotices: Record<string, string> = {
  "settings-updated": "ビザ期限を更新しました",
  "invalid-date": "日付を正しく入力してください",
  "settings-error": "ビザ期限を更新できませんでした",
};

function VisaCard({ settings }: { settings: AppSettings | null }) {
  const visaExpiryDate = settings?.visa_expiry_date ?? null;
  const daysLeft = visaExpiryDate
    ? daysUntilDate(visaExpiryDate, settings?.timezone ?? "America/Vancouver")
    : null;

  return (
    <section className="dashboard-card visa-card">
      <div className="card-eyebrow">
        <span className="flag" aria-hidden="true">
          🇨🇦
        </span>
        VISA
      </div>
      {visaExpiryDate ? (
        <>
          <p className="countdown">
            {daysLeft === 0 ? (
              "今日まで"
            ) : daysLeft !== null && daysLeft > 0 ? (
              <>
                あと <strong>{daysLeft}</strong> 日
              </>
            ) : (
              <span className="expired">期限を過ぎています</span>
            )}
          </p>
          <p className="date-display">
            〜 {formatJapaneseDate(visaExpiryDate)}
          </p>
        </>
      ) : (
        <div className="visa-empty">
          <CalendarDays size={24} aria-hidden="true" />
          <p>ビザ期限を設定してください</p>
        </div>
      )}

      {settings ? (
        <details className="settings-details">
          <summary>
            <Pencil size={14} aria-hidden="true" />
            期限を編集
          </summary>
          <form action={updateSettingsAction}>
            <input
              type="date"
              name="visa_expiry_date"
              defaultValue={visaExpiryDate ?? ""}
              aria-label="ビザ期限"
            />
            <button type="submit" className="button button-small">
              保存
            </button>
          </form>
        </details>
      ) : (
        <span className="settings-unavailable">DB接続後に設定できます</span>
      )}
    </section>
  );
}

function PriorityList({ tasks }: { tasks: Task[] }) {
  return (
    <section className="priority-section">
      <div className="section-heading">
        <div>
          <span>TODAY&apos;S FOCUS</span>
          <h2>今日の優先タスク</h2>
        </div>
        <div className="section-heading-actions">
          <span className="task-count">{tasks.length}</span>
          <Link
            href="/tasks/new"
            className="button button-primary priority-add-button"
          >
            <Plus size={17} aria-hidden="true" />
            タスクを追加
          </Link>
        </div>
      </div>

      {tasks.length > 0 ? (
        <div className="priority-list">
          {tasks.map((task, index) => (
            <Link
              href={`/tasks?task=${task.id}`}
              className="priority-item"
              key={task.id}
            >
              <span className="priority-index">0{index + 1}</span>
              <span className="priority-copy">
                <span>
                  <b className={`priority-text priority-${task.priority}`}>
                    {priorityCardLabels[task.priority]}
                  </b>
                  <i>·</i>
                  {categoryLabels[task.category]}
                </span>
                <strong>{task.title}</strong>
              </span>
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-priority">
          <span aria-hidden="true">✓</span>
          <p>アクティブなタスクはありません。</p>
          <small>次の一歩を追加しましょう。</small>
        </div>
      )}

      <Link href="/tasks" className="text-link">
        タスクをすべて見る <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </section>
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;
  let settings: AppSettings | null = null;
  let tasks: Task[] = [];
  let streak = 0;
  let loadError: string | null = null;

  try {
    settings = await getSettings();
    [tasks, streak] = await Promise.all([
      getPriorityTasks(),
      getCurrentStreak(settings.timezone),
    ]);
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "データを読み込めませんでした。";
  }

  return (
    <div className="home-page">
      {notice && homeNotices[notice] && (
        <div className="inline-notice" role="status">
          {homeNotices[notice]}
        </div>
      )}

      <div className="dashboard-grid">
        <VisaCard settings={settings} />
        <section className="dashboard-card streak-card">
          <div className="card-eyebrow">CURRENT STREAK</div>
          <div className="streak-value">
            <span className="flame-icon">
              <Flame size={25} fill="currentColor" />
            </span>
            <strong>{streak}</strong>
            <span>日連続</span>
          </div>
          <p>
            {streak > 0
              ? "継続は力なり。"
              : "今日ひとつ完了して、ストリークを始めよう。"}
          </p>
        </section>
      </div>

      {loadError && (
        <section className="connection-warning" role="status">
          <div>
            <strong>Supabaseに未接続です</strong>
            <span>{loadError}</span>
          </div>
          <p>
            <code>.env.local</code> を設定すると、保存済みデータが表示されます。
          </p>
        </section>
      )}

      <PriorityList tasks={tasks} />
    </div>
  );
}
