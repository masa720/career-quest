"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { createTaskAction, type CreateTaskState } from "@/app/actions";
import {
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  categoryLabels,
  priorityLabels,
} from "@/features/tasks/types";

const initialState: CreateTaskState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="button button-primary form-submit"
      disabled={pending}
    >
      {pending ? "保存中…" : "タスクを追加 🚀"}
    </button>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="field-error">{errors[0]}</p>;
}

export function TaskCreateForm() {
  const [state, formAction] = useActionState(createTaskAction, initialState);
  const [isDaily, setIsDaily] = useState(false);
  const [isToday, setIsToday] = useState(false);

  return (
    <form action={formAction} className="task-form">
      {state.error && <div className="form-error">{state.error}</div>}

      <label className="checkbox-field today-quick-pick">
        <input
          type="checkbox"
          name="is_today"
          checked={isToday}
          onChange={(event) => {
            setIsToday(event.target.checked);
            if (event.target.checked) setIsDaily(false);
          }}
        />
        <span className="checkbox-control" aria-hidden="true" />
        <span className="checkbox-copy">🎯 今日やるタスクに追加</span>
      </label>

      <div className="form-grid">
        <label className="field">
          <span>カテゴリ</span>
          <select name="category" defaultValue="technical">
            {TASK_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {categoryLabels[category]}
              </option>
            ))}
          </select>
          <FieldError errors={state.fieldErrors?.category} />
        </label>

        <label className="field">
          <span>優先度</span>
          <select name="priority" defaultValue="medium">
            {TASK_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priorityLabels[priority]}
              </option>
            ))}
          </select>
          <FieldError errors={state.fieldErrors?.priority} />
        </label>
      </div>

      <label className="field">
        <span>
          タスク名 <em>*</em>
        </span>
        <input
          name="title"
          required
          maxLength={200}
          placeholder="例：async/awaitを英語で説明する"
          autoFocus
        />
        <FieldError errors={state.fieldErrors?.title} />
      </label>

      <label className="field">
        <span>詳細</span>
        <textarea
          name="description"
          rows={4}
          maxLength={5000}
          placeholder="完了の条件や、取り組む内容を書いておく"
        />
        <FieldError errors={state.fieldErrors?.description} />
      </label>

      <label className="field">
        <span>メモ</span>
        <textarea
          name="memo"
          rows={3}
          maxLength={5000}
          placeholder="あとで残したい気づきなど（空でもOK）"
        />
        <FieldError errors={state.fieldErrors?.memo} />
      </label>

      <label className="checkbox-field">
        <input
          type="checkbox"
          name="is_daily"
          checked={isDaily}
          onChange={(event) => {
            setIsDaily(event.target.checked);
            if (event.target.checked) setIsToday(false);
          }}
        />
        <span className="checkbox-control" aria-hidden="true" />
        <span className="checkbox-copy">毎日のタスクにする</span>
      </label>

      <SubmitButton />
    </form>
  );
}
