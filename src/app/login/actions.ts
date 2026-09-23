"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getOwnerUserId } from "@/lib/supabase/auth-config";
import { createAuthServerClient } from "@/lib/supabase/auth-server";

export type LoginState = { error?: string; message?: string };

const loginSchema = z.object({
  email: z.string().trim().email("メールアドレスを確認してください。"),
  password: z.string().min(1, "パスワードを入力してください。"),
});

export async function loginWithPassword(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createAuthServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    console.error("loginWithPassword", error.message);
    return { error: "ログインIDまたはパスワードが違います。" };
  }

  const { data } = await supabase.auth.getClaims();
  if (data?.claims.sub !== getOwnerUserId()) {
    await supabase.auth.signOut();
    return { error: "このアカウントにはアクセス権がありません。" };
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createAuthServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
