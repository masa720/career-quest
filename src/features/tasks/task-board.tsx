"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Check,
  GripVertical,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  createReviewTaskAction,
  deleteTaskAction,
  moveTaskAction,
  updateTaskAction,
} from "@/app/actions";
import {
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  categoryLabels,
  priorityCardLabels,
  priorityLabels,
  statusLabels,
  type Task,
  type TaskCategory,
  type TaskPriority,
  type TaskStatus,
} from "./types";

type FilterValue<T extends string> = T | "all";

const columnDescriptions: Record<TaskStatus, string> = {
  todo: "これから取り組む",
  doing: "いま集中する",
  done: "積み上げた成果",
};

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

function getColumnOrders(tasks: Task[]): Record<TaskStatus, string[]> {
  return {
    todo: sortTasks(tasks.filter((task) => task.status === "todo")).map(
      (task) => task.id,
    ),
    doing: sortTasks(tasks.filter((task) => task.status === "doing")).map(
      (task) => task.id,
    ),
    done: sortTasks(tasks.filter((task) => task.status === "done")).map(
      (task) => task.id,
    ),
  };
}

function TaskCardContent({ task }: { task: Task }) {
  return (
    <>
      <div className="task-card-meta">
        <span className={`priority-badge priority-${task.priority}`}>
          {priorityCardLabels[task.priority]}
        </span>
        <span className="category-label">{categoryLabels[task.category]}</span>
      </div>
      <h3>{task.title}</h3>
      {task.description && <p>{task.description}</p>}
    </>
  );
}

function SortableTaskCard({
  task,
  dragDisabled,
  onOpen,
  onReview,
  reviewPending,
}: {
  task: Task;
  dragDisabled: boolean;
  onOpen: (task: Task) => void;
  onReview: (task: Task) => void;
  reviewPending: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: dragDisabled });

  return (
    <article
      ref={setNodeRef}
      className={`task-card ${isDragging ? "is-dragging" : ""}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        type="button"
        className="card-main"
        onClick={() => onOpen(task)}
        aria-label={`${task.title}を編集`}
      >
        <TaskCardContent task={task} />
      </button>
      <div className="card-actions">
        {task.status === "done" && (
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
          className="drag-handle"
          aria-label={`${task.title}を移動`}
          title={dragDisabled ? "フィルター解除後に並び替えできます" : "ドラッグして移動"}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={18} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

function KanbanColumn({
  status,
  tasks,
  dragDisabled,
  onOpen,
  onReview,
  reviewPendingId,
}: {
  status: TaskStatus;
  tasks: Task[];
  dragDisabled: boolean;
  onOpen: (task: Task) => void;
  onReview: (task: Task) => void;
  reviewPendingId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${status}` });

  return (
    <section
      ref={setNodeRef}
      className={`kanban-column ${isOver ? "is-over" : ""}`}
      aria-labelledby={`column-heading-${status}`}
    >
      <div className="column-heading">
        <div>
          <h2 id={`column-heading-${status}`}>{statusLabels[status]}</h2>
          <p>{columnDescriptions[status]}</p>
        </div>
        <span>{tasks.length}</span>
      </div>

      <SortableContext items={tasks.map((task) => task.id)} strategy={rectSortingStrategy}>
        <div className="task-list">
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              dragDisabled={dragDisabled}
              onOpen={onOpen}
              onReview={onReview}
              reviewPending={reviewPendingId === task.id}
            />
          ))}
          {tasks.length === 0 && (
            <div className="empty-column">
              <span aria-hidden="true">{status === "done" ? "✓" : "·"}</span>
              タスクはありません
            </div>
          )}
        </div>
      </SortableContext>
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(task);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

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
        status: draft.status,
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
    <dialog
      ref={dialogRef}
      className="task-dialog"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form className="dialog-panel" onSubmit={save}>
        <div className="dialog-heading">
          <div>
            <span>タスク詳細</span>
            <h2>編集する</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="閉じる">
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
                setDraft({ ...draft, category: event.target.value as TaskCategory })
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
                setDraft({ ...draft, priority: event.target.value as TaskPriority })
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
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            maxLength={200}
            required
          />
        </label>
        <label className="field">
          <span>詳細</span>
          <textarea
            value={draft.description ?? ""}
            onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            rows={3}
            maxLength={5000}
          />
        </label>
        <label className="field">
          <span>メモ</span>
          <textarea
            value={draft.memo ?? ""}
            onChange={(event) => setDraft({ ...draft, memo: event.target.value })}
            rows={3}
            maxLength={5000}
          />
        </label>
        <label className="field">
          <span>ステータス</span>
          <select
            value={draft.status}
            onChange={(event) =>
              setDraft({ ...draft, status: event.target.value as TaskStatus })
            }
          >
            {TASK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
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
          <button type="submit" className="button button-primary" disabled={isPending}>
            <Check size={17} />
            {isPending ? "保存中…" : "保存する"}
          </button>
        </div>
      </form>
    </dialog>
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(
    initialTasks.find((task) => task.id === selectedTaskId) ?? null,
  );
  const [notice, setNotice] = useState(
    initialNotice ? noticeMessages[initialNotice] ?? initialNotice : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [reviewPendingId, setReviewPendingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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

  const filtered = category !== "all" || priority !== "all" || query.trim() !== "";
  const activeTask = tasks.find((task) => task.id === activeId) ?? null;

  function tasksFor(status: TaskStatus) {
    return sortTasks(filteredTasks.filter((task) => task.status === status));
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    if (!event.over || filtered) return;

    const draggedId = String(event.active.id);
    const overId = String(event.over.id);
    const draggedTask = tasks.find((task) => task.id === draggedId);
    if (!draggedTask) return;

    const targetStatus = overId.startsWith("column-")
      ? (overId.replace("column-", "") as TaskStatus)
      : tasks.find((task) => task.id === overId)?.status;
    if (!targetStatus) return;

    const previous = tasks;
    const orders = getColumnOrders(tasks);
    const sourceItems = orders[draggedTask.status].filter((id) => id !== draggedId);
    const targetItems =
      draggedTask.status === targetStatus
        ? sourceItems
        : orders[targetStatus].filter((id) => id !== draggedId);

    let nextTargetItems: string[];
    if (draggedTask.status === targetStatus && overId !== `column-${targetStatus}`) {
      const oldIndex = orders[targetStatus].indexOf(draggedId);
      const newIndex = orders[targetStatus].indexOf(overId);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
      nextTargetItems = arrayMove(orders[targetStatus], oldIndex, newIndex);
    } else {
      const targetIndex = targetItems.indexOf(overId);
      nextTargetItems = [...targetItems];
      nextTargetItems.splice(targetIndex < 0 ? nextTargetItems.length : targetIndex, 0, draggedId);
    }

    orders[draggedTask.status] = sourceItems;
    orders[targetStatus] = nextTargetItems;

    const positions = new Map<string, { status: TaskStatus; position: number }>();
    for (const status of TASK_STATUSES) {
      orders[status].forEach((id, position) => positions.set(id, { status, position }));
    }
    const next = tasks.map((task) => {
      const placement = positions.get(task.id);
      return placement ? { ...task, ...placement } : task;
    });

    setTasks(next);
    setError(null);
    void moveTaskAction({
      taskId: draggedId,
      targetStatus,
      columnOrders: orders,
    }).then((result) => {
      if (!result.ok) {
        setTasks(previous);
        setError(result.error);
        return;
      }
      if (result.task) {
        setTasks((current) =>
          current.map((task) =>
            task.id === result.task?.id ? { ...task, ...result.task } : task,
          ),
        );
      }
    });
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
        <p className="filter-note">
          {filteredTasks.length}件を表示中 · 並び替えはフィルター解除後に使えます
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragCancel={() => setActiveId(null)}
        onDragEnd={handleDragEnd}
      >
        <div className="kanban-board">
          {TASK_STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={tasksFor(status)}
              dragDisabled={filtered}
              onOpen={setSelectedTask}
              onReview={handleReview}
              reviewPendingId={reviewPendingId}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask && (
            <article className="task-card drag-overlay">
              <TaskCardContent task={activeTask} />
            </article>
          )}
        </DragOverlay>
      </DndContext>

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
