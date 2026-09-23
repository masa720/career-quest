"use client";

import { LockKeyhole, Mail } from "lucide-react";
import { useActionState } from "react";

import { loginWithPassword, type LoginState } from "@/app/login/actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginWithPassword, initialState);

  return (
    <form action={action} className="login-form">
      <label htmlFor="email">ログインID（メールアドレス）</label>
      <div className="login-input-wrap">
        <Mail size={18} aria-hidden="true" />
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder="you@example.com"
        />
      </div>
      <label htmlFor="password">パスワード</label>
      <div className="login-input-wrap">
        <LockKeyhole size={18} aria-hidden="true" />
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="パスワード"
        />
      </div>
      <button type="submit" disabled={pending}>
        {pending ? "ログイン中…" : "ログイン"}
      </button>
      <div className="login-feedback" aria-live="polite">
        {state.error && <p className="login-error">{state.error}</p>}
      </div>
    </form>
  );
}
