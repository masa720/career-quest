"use client";

import {
  CalendarCheck2,
  Check,
  Pencil,
  Repeat2,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import {
  createReviewTaskAction,
  deleteTaskAction,
  setTaskCompletionAction,
  setTaskTodayAction,
  updateTaskAction,
} from "@/app/actions";
import {
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  categoryLabels,
  priorityCardLabels,
  priorityLabels,
  type Task,
  type TaskCategory,
  type TaskPriority,
} from "./types";

type FilterValue<T extends string> = T | "all";

const noticeMessages: Record<string, string> = {
  created: "タスクを追加しました",
};

function sortTasks(tasks: Task[]) {
  return [...tasks].sort(
    (a, b) =>
      a.position - b.position ||
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

function TaskCardContent({ task }: { task: Task }) {
  return (
    <>
      <div className="task-card-meta">
        <span className={`priority-badge priority-${task.priority}`}>
          {priorityCardLabels[task.priority]}
        </span>
        <span className="task-card-tags">
          {task.is_daily && (
            <span className="daily-badge">
              <Repeat2 size={11} />
              毎日
            </span>
          )}
          {task.scheduled_for && !task.is_daily && (
            <span className="today-badge">🎯 今日やる</span>
          )}
          <span className="category-label">
            {categoryLabels[task.category]}
          </span>
        </span>
      </div>
      <h3>{task.title}</h3>
      {task.description && <p>{task.description}</p>}
    </>
  );
}

function TaskCard({
  task,
  onDetails,
  onToggle,
  onToggleToday,
  onOpen,
  onReview,
  onDelete,
  reviewPending,
  deletePending,
  togglePending,
  todayPending,
}: {
  task: Task;
  onDetails: (task: Task) => void;
  onToggle: (task: Task) => void;
  onToggleToday: (task: Task) => void;
  onOpen: (task: Task) => void;
  onReview: (task: Task) => void;
  onDelete: (task: Task) => void;
  reviewPending: boolean;
  deletePending: boolean;
  togglePending: boolean;
  todayPending: boolean;
}) {
  return (
    <article className="task-card">
      <div className="task-card-body">
        <button
          type="button"
          className={`task-complete-checkbox ${task.is_completed ? "is-checked" : ""}`}
          onClick={() => onToggle(task)}
          disabled={togglePending}
          role="checkbox"
          aria-checked={task.is_completed}
          aria-label={
            task.is_completed
              ? `${task.title}を未着手に戻す`
              : `${task.title}を完了にする`
          }
          aria-busy={togglePending}
          title={task.is_completed ? "未着手に戻す" : "完了にする"}
        >
          {(task.is_completed || togglePending) && (
            <Check size={13} aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          className="card-main"
          onClick={() => onDetails(task)}
          aria-label={`${task.title}の詳細を見る`}
        >
          <TaskCardContent task={task} />
        </button>
      </div>
      <div className="card-actions">
        {!task.is_daily && (
          <button
            type="button"
            className={`card-today-button ${task.scheduled_for ? "is-active" : ""}`}
            onClick={() => onToggleToday(task)}
            disabled={todayPending}
            aria-pressed={task.scheduled_for !== null}
            aria-label={
              task.scheduled_for
                ? `${task.title}を今日やるタスクから外す`
                : `${task.title}を今日やるタスクに追加`
            }
            title={task.scheduled_for ? "今日やるから外す" : "今日やる"}
          >
            <CalendarCheck2 size={15} aria-hidden="true" />
          </button>
        )}
        {task.is_completed && (
          <button
            type="button"
            className="review-button"
            onClick={() => onReview(task)}
            disabled={reviewPending}
          >
            <RotateCcw size={14} aria-hidden="true" />
            {reviewPending ? "追加中…" : "復習する"}
          </button>
        )}
        <button
          type="button"
          className="card-edit-button"
          onClick={() => onOpen(task)}
          aria-label={`${task.title}を編集`}
          title="編集"
        >
          <Pencil size={15} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="card-delete-button"
          onClick={() => onDelete(task)}
          disabled={deletePending}
          aria-label={`${task.title}を削除`}
          title="削除"
        >
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

function KanbanColumn({
  completed,
  tasks,
  onDetails,
  onToggle,
  onToggleToday,
  onOpen,
  onReview,
  onDelete,
  reviewPendingId,
  deletePendingId,
  togglePendingId,
  todayPendingId,
}: {
  completed: boolean;
  tasks: Task[];
  onDetails: (task: Task) => void;
  onToggle: (task: Task) => void;
  onToggleToday: (task: Task) => void;
  onOpen: (task: Task) => void;
  onReview: (task: Task) => void;
  onDelete: (task: Task) => void;
  reviewPendingId: string | null;
  deletePendingId: string | null;
  togglePendingId: string | null;
  todayPendingId: string | null;
}) {
  return (
    <section
      className="kanban-column"
      aria-labelledby={`column-heading-${completed ? "done" : "todo"}`}
    >
      <div className="column-heading">
        <div>
          <h2 id={`column-heading-${completed ? "done" : "todo"}`}>
            {completed ? "✅ 完了" : "📝 未着手"}
          </h2>
        </div>
        <span>{tasks.length}</span>
      </div>

      <div className="task-list">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onDetails={onDetails}
              onToggle={onToggle}
              onToggleToday={onToggleToday}
              onOpen={onOpen}
              onReview={onReview}
              onDelete={onDelete}
              reviewPending={reviewPendingId === task.id}
              deletePending={deletePendingId === task.id}
              togglePending={togglePendingId === task.id}
              todayPending={todayPendingId === task.id}
            />
          ))}
          {tasks.length === 0 && (
            <div className="empty-column">
              <span aria-hidden="true">{completed ? "✓" : "·"}</span>
              タスクはありません
            </div>
          )}
      </div>
    </section>
  );
}

function TaskDialog({
  task,
  onClose,
  onSaved,
  onDeleted,
}: {
  task: Task;
  onClose: () => void;
  onSaved: (task: Task) => void;
  onDeleted: (id: string) => void;
}) {
  const [draft, setDraft] = useState(task);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateTaskAction({
        id: draft.id,
        category: draft.category,
        title: draft.title,
        priority: draft.priority,
        description: draft.description ?? "",
        memo: draft.memo ?? "",
        is_completed: draft.is_completed,
        is_daily: draft.is_daily,
        is_today: draft.scheduled_for !== null,
      });
      if (!result.ok || !result.task) {
        setError(result.ok ? "更新に失敗しました。" : result.error);
        return;
      }
      onSaved(result.task);
      onClose();
    });
  }

  function remove() {
    if (!window.confirm("このタスクを削除しますか？")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteTaskAction(task.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDeleted(task.id);
      onClose();
    });
  }

  return (
    <div
      className="task-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="task-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-dialog-title"
      >
        <form className="dialog-panel" onSubmit={save}>
          <div className="dialog-heading">
            <div>
              <span>タスク詳細</span>
              <h2 id="task-dialog-title">✏️ 編集する</h2>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={onClose}
              aria-label="閉じる"
            >
              <X size={20} />
            </button>
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="form-grid">
            <label className="field">
              <span>カテゴリ</span>
              <select
                value={draft.category}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    category: event.target.value as TaskCategory,
                  })
                }
              >
                {TASK_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {categoryLabels[category]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>優先度</span>
              <select
                value={draft.priority}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    priority: event.target.value as TaskPriority,
                  })
                }
              >
                {TASK_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priorityLabels[priority]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="field">
            <span>タスク名</span>
            <input
              value={draft.title}
              onChange={(event) =>
                setDraft({ ...draft, title: event.target.value })
              }
              maxLength={200}
              required
            />
          </label>
          <label className="field">
            <span>詳細</span>
            <textarea
              value={draft.description ?? ""}
              onChange={(event) =>
                setDraft({ ...draft, description: event.target.value })
              }
              rows={3}
              maxLength={5000}
            />
          </label>
          <label className="field">
            <span>メモ</span>
            <textarea
              value={draft.memo ?? ""}
              onChange={(event) =>
                setDraft({ ...draft, memo: event.target.value })
              }
              rows={3}
              maxLength={5000}
            />
          </label>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={draft.is_completed}
              onChange={(event) =>
                setDraft({ ...draft, is_completed: event.target.checked })
              }
            />
            <span className="checkbox-control" aria-hidden="true" />
            <span className="checkbox-copy">完了</span>
          </label>

          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={draft.scheduled_for !== null}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  scheduled_for: event.target.checked
                    ? draft.scheduled_for ?? "today"
                    : null,
                  selected_at: event.target.checked
                    ? draft.selected_at ?? "today"
                    : null,
                  is_daily: event.target.checked ? false : draft.is_daily,
                })
              }
            />
            <span className="checkbox-control" aria-hidden="true" />
            <span className="checkbox-copy">今日やるタスク</span>
          </label>

          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={draft.is_daily}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  is_daily: event.target.checked,
                  scheduled_for: event.target.checked
                    ? null
                    : draft.scheduled_for,
                  selected_at: event.target.checked ? null : draft.selected_at,
                })
              }
            />
            <span className="checkbox-control" aria-hidden="true" />
            <span className="checkbox-copy">毎日のタスク</span>
          </label>

          <div className="dialog-actions">
            <button
              type="button"
              className="button button-danger"
              onClick={remove}
              disabled={isPending}
            >
              <Trash2 size={16} />
              削除
            </button>
            <button
              type="submit"
              className="button button-primary"
              disabled={isPending}
            >
              <Check size={17} />
              {isPending ? "保存中…" : "保存する"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function TaskBoard({
  initialTasks,
  initialNotice,
  selectedTaskId,
}: {
  initialTasks: Task[];
  initialNotice?: string;
  selectedTaskId?: string;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [category, setCategory] = useState<FilterValue<TaskCategory>>("all");
  const [priority, setPriority] = useState<FilterValue<TaskPriority>>("all");
  const [query, setQuery] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(
    initialTasks.find((task) => task.id === selectedTaskId) ?? null,
  );
  const [notice, setNotice] = useState(
    initialNotice ? (noticeMessages[initialNotice] ?? initialNotice) : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [reviewPendingId, setReviewPendingId] = useState<string | null>(null);
  const [deletePendingId, setDeletePendingId] = useState<string | null>(null);
  const [togglePendingId, setTogglePendingId] = useState<string | null>(null);
  const [todayPendingId, setTodayPendingId] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const filteredTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return tasks.filter(
      (task) =>
        (category === "all" || task.category === category) &&
        (priority === "all" || task.priority === priority) &&
        (!normalizedQuery ||
          task.title.toLocaleLowerCase().includes(normalizedQuery) ||
          task.description?.toLocaleLowerCase().includes(normalizedQuery)),
    );
  }, [tasks, category, priority, query]);

  const filtered =
    category !== "all" || priority !== "all" || query.trim() !== "";
  function tasksFor(completed: boolean) {
    return sortTasks(
      filteredTasks.filter((task) => task.is_completed === completed),
    );
  }

  function handleReview(task: Task) {
    setReviewPendingId(task.id);
    setError(null);
    void createReviewTaskAction(task.id).then((result) => {
      setReviewPendingId(null);
      if (!result.ok || !result.task) {
        setError(result.ok ? "復習タスクの追加に失敗しました。" : result.error);
        return;
      }
      setTasks((current) => [...current, result.task as Task]);
      setNotice("復習タスクを追加しました");
    });
  }

  function handleToggle(task: Task) {
    setTogglePendingId(task.id);
    setError(null);
    void setTaskCompletionAction({
      id: task.id,
      isCompleted: !task.is_completed,
    }).then((result) => {
      setTogglePendingId(null);
      if (!result.ok || !result.task) {
        setError(result.ok ? "完了状態の更新に失敗しました。" : result.error);
        return;
      }
      setTasks((current) =>
        current.map((item) =>
          item.id === result.task?.id ? (result.task as Task) : item,
        ),
      );
    });
  }

  function handleToggleToday(task: Task) {
    setTodayPendingId(task.id);
    setError(null);
    void setTaskTodayAction({
      id: task.id,
      isToday: task.scheduled_for === null,
    }).then((result) => {
      setTodayPendingId(null);
      if (!result.ok || !result.task) {
        setError(
          result.ok ? "今日やるタスクの更新に失敗しました。" : result.error,
        );
        return;
      }
      setTasks((current) =>
        current.map((item) =>
          item.id === result.task?.id ? (result.task as Task) : item,
        ),
      );
    });
  }

  function handleCardDelete(task: Task) {
    if (!window.confirm(`「${task.title}」を削除しますか？`)) return;
    setDeletePendingId(task.id);
    setError(null);
    void deleteTaskAction(task.id).then((result) => {
      setDeletePendingId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTasks((current) => current.filter((item) => item.id !== task.id));
      if (selectedTask?.id === task.id) setSelectedTask(null);
      setNotice("タスクを削除しました");
    });
  }

  function closeDialog() {
    setSelectedTask(null);
    if (selectedTaskId) router.replace("/tasks", { scroll: false });
  }

  return (
    <>
      {(notice || error) && (
        <div className={`toast ${error ? "toast-error" : ""}`} role="status">
          {error ? <X size={17} /> : <Check size={17} />}
          {error ?? notice}
        </div>
      )}

      <div className="filters" aria-label="タスクを絞り込む">
        <label className="search-field">
          <Search size={17} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="タスクを検索"
            aria-label="タスクを検索"
          />
        </label>
        <label>
          <span>カテゴリ</span>
          <select
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as FilterValue<TaskCategory>)
            }
          >
            <option value="all">すべて</option>
            {TASK_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {categoryLabels[value]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>優先度</span>
          <select
            value={priority}
            onChange={(event) =>
              setPriority(event.target.value as FilterValue<TaskPriority>)
            }
          >
            <option value="all">すべて</option>
            {TASK_PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {priorityLabels[value]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtered && (
        <p className="filter-note">{filteredTasks.length}件を表示中</p>
      )}

      <div className="kanban-board">
        {[false, true].map((completed) => (
          <KanbanColumn
            key={String(completed)}
            completed={completed}
            tasks={tasksFor(completed)}
            onDetails={(task) => router.push(`/tasks/${task.id}`)}
            onToggle={handleToggle}
            onToggleToday={handleToggleToday}
            onOpen={setSelectedTask}
            onReview={handleReview}
            onDelete={handleCardDelete}
            reviewPendingId={reviewPendingId}
            deletePendingId={deletePendingId}
            togglePendingId={togglePendingId}
            todayPendingId={todayPendingId}
          />
        ))}
      </div>

      {selectedTask && (
        <TaskDialog
          key={selectedTask.id}
          task={selectedTask}
          onClose={closeDialog}
          onSaved={(saved) => {
            setTasks((current) =>
              current.map((task) => (task.id === saved.id ? saved : task)),
            );
            setNotice("タスクを更新しました");
          }}
          onDeleted={(id) => {
            setTasks((current) => current.filter((task) => task.id !== id));
            setNotice("タスクを削除しました");
          }}
        />
      )}
    </>
  );
}
