"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createAuthServerClient } from "@/lib/supabase/auth-server";

export type LoginState = { error?: string; message?: string };

const loginSchema = z.object({
  email: z.string().trim().email("メールアドレスを確認してください。"),
});

export async function requestMagicLink(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const requestHeaders = await headers();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    requestHeaders.get("origin") ??
    "http://localhost:3000";
  const supabase = await createAuthServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      shouldCreateUser: false,
    },
  });

  if (error) {
    console.error("requestMagicLink", error.message);
    return { error: "ログインリンクを送信できませんでした。登録済みのメールか確認してください。" };
  }

  return { message: "ログインリンクを送信しました。メールを確認してください。" };
}

export async function signOut() {
  const supabase = await createAuthServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
