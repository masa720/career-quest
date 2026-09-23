"use client";

import { Mail } from "lucide-react";
import { useActionState } from "react";

import { requestMagicLink, type LoginState } from "@/app/login/actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(requestMagicLink, initialState);

  return (
    <form action={action} className="login-form">
      <label htmlFor="email">メールアドレス</label>
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
      <button type="submit" disabled={pending}>
        {pending ? "送信中…" : "ログインリンクを送る"}
      </button>
      <div className="login-feedback" aria-live="polite">
        {state.error && <p className="login-error">{state.error}</p>}
        {state.message && <p className="login-success">{state.message}</p>}
      </div>
    </form>
  );
}
