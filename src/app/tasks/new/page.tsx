import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { TaskCreateForm } from "@/components/task-create-form";

export const metadata = { title: "タスク登録" };

export default function NewTaskPage() {
  return (
    <div className="narrow-page">
      <Link href="/tasks" className="back-link">
        <ArrowLeft size={16} /> タスク一覧
      </Link>
      <div className="page-title-block">
        <h1>タスクを追加</h1>
      </div>
      <TaskCreateForm />
    </div>
  );
}
