import { Plus } from "lucide-react";
import Link from "next/link";

import { TaskBoard } from "@/features/tasks/task-board";
import { getTasks } from "@/server/tasks/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "タスク一覧" };

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; task?: string }>;
}) {
  const params = await searchParams;
  let tasks: Awaited<ReturnType<typeof getTasks>> = [];
  let loadError: string | null = null;

  try {
    tasks = await getTasks();
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Supabaseの設定を確認してください。";
  }

  if (loadError) {
    return (
      <div className="tasks-page">
        <div className="page-title-block">
          <p className="page-kicker">QUEST BOARD</p>
          <h1>タスク一覧</h1>
        </div>
        <section className="setup-state">
          <strong>タスクを読み込めませんでした</strong>
          <p>{loadError}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="tasks-page">
      <div className="board-title-row">
        <div>
          <p className="page-kicker">QUEST BOARD</p>
          <h1>タスク一覧</h1>
          <p>カードをドラッグして、進み具合を更新できます。</p>
        </div>
        <Link href="/tasks/new" className="button button-primary">
          <Plus size={18} /> タスクを追加
        </Link>
      </div>
      <TaskBoard
        initialTasks={tasks}
        initialNotice={params.notice}
        selectedTaskId={params.task}
      />
    </div>
  );
}
