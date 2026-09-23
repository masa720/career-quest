import { LockKeyhole } from "lucide-react";

import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <section className="login-page">
      <div className="login-card">
        <div className="login-brand" aria-hidden="true">CQ</div>
        <LockKeyhole className="login-lock" size={24} aria-hidden="true" />
        <p className="page-kicker">PRIVATE ACCESS</p>
        <h1>CareerQuest</h1>
        <p className="login-copy">
          登録済みの所有者メールへ、1回限りのログインリンクを送ります。
        </p>
        {error === "unauthorized" && (
          <p className="login-error">このアカウントにはアクセス権がありません。</p>
        )}
        <LoginForm />
      </div>
    </section>
  );
}
