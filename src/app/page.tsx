import { ArrowRight, CalendarDays, Flame, Pencil, Repeat2 } from "lucide-react";
import Link from "next/link";

import { updateSettingsAction } from "@/app/actions";
import { TaskCompleteButton } from "@/components/task-complete-button";
import { VisaCountdown } from "@/components/visa-countdown";
import {
  categoryLabels,
  priorityCardLabels,
  type Task,
} from "@/features/tasks/types";
import { daysUntilDate, formatJapaneseDate } from "@/lib/date";
import { getSettings, type AppSettings } from "@/server/settings/queries";
import {
  getCurrentStreak,
  getDailyTasks,
  getPriorityTasks,
  rolloverDailyTasks,
} from "@/server/tasks/queries";

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
      {visaExpiryDate ? (
        <>
          <VisaCountdown
            expiryDate={visaExpiryDate}
            timezone={settings?.timezone ?? "America/Vancouver"}
            fallbackDays={daysLeft ?? 0}
          />
          <p className="date-display">
            期限日 <strong>{formatJapaneseDate(visaExpiryDate)}</strong>
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
    <div className="home-task-group priority-group">
      <div className="section-heading">
        <div>
          <h2>🎯 今日の優先タスク</h2>
        </div>
        <span className="task-count">{tasks.length}</span>
      </div>

      {tasks.length > 0 ? (
        <div className="priority-list">
          {tasks.map((task) => {
            const completed = task.status === "done";
            return (
              <div
                className={`home-task-card priority-item ${completed ? "is-complete" : ""}`}
                key={task.id}
              >
                <TaskCompleteButton
                  taskId={task.id}
                  title={task.title}
                  completed={completed}
                />
                <Link
                  href={`/tasks/${task.id}`}
                  className="home-task-link"
                >
                  <span className="home-task-copy">
                    <strong>{task.title}</strong>
                    <small>
                      <b className={`priority-text priority-${task.priority}`}>
                        {priorityCardLabels[task.priority]}
                      </b>
                      <i>·</i>
                      {categoryLabels[task.category]}
                    </small>
                  </span>
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            );
          })}
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
    </div>
  );
}

function DailyTaskList({ tasks }: { tasks: Task[] }) {
  const completedCount = tasks.filter((task) => task.status === "done").length;

  return (
    <div className="home-task-group daily-group">
      <div className="section-heading daily-heading">
        <div>
          <h2>🔁 毎日のタスク</h2>
        </div>
        {tasks.length > 0 && (
          <span className="daily-progress">
            {completedCount} / {tasks.length}
          </span>
        )}
      </div>

      {tasks.length > 0 ? (
        <div className="daily-list">
          {tasks.map((task) => {
            const completed = task.status === "done";
            return (
              <div
                key={task.id}
                className={`home-task-card daily-item ${completed ? "is-complete" : ""}`}
              >
                <TaskCompleteButton
                  taskId={task.id}
                  title={task.title}
                  completed={completed}
                />
                <Link
                  href={`/tasks/${task.id}`}
                  className="home-task-link"
                >
                  <span className="home-task-copy">
                    <strong>{task.title}</strong>
                    <small>{categoryLabels[task.category]}</small>
                  </span>
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="daily-empty">
          <Repeat2 size={18} aria-hidden="true" />
          <span>
            <strong>毎日のタスクはありません</strong>
            <small>通常のタスク登録で「毎日のタスク」を選択できます</small>
          </span>
        </div>
      )}
    </div>
  );
}

function TaskOverview({
  dailyTasks,
  priorityTasks,
}: {
  dailyTasks: Task[];
  priorityTasks: Task[];
}) {
  return (
    <section className="tasks-overview">
      <DailyTaskList tasks={dailyTasks} />
      <PriorityList tasks={priorityTasks} />
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
  let dailyTasks: Task[] = [];
  let streak = 0;
  let loadError: string | null = null;

  try {
    settings = await getSettings();
    await rolloverDailyTasks();
    [tasks, dailyTasks, streak] = await Promise.all([
      getPriorityTasks(settings.timezone),
      getDailyTasks(),
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
          <div className="card-eyebrow">🔥 CURRENT STREAK</div>
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

      <TaskOverview dailyTasks={dailyTasks} priorityTasks={tasks} />
    </div>
  );
}
