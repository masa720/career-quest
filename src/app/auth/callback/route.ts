import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { getOwnerUserId } from "@/lib/supabase/auth-config";
import { createAuthServerClient } from "@/lib/supabase/auth-server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const supabase = await createAuthServerClient();

  const authResult = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("認証情報がありません。") };

  if (authResult.error) {
    return NextResponse.redirect(new URL("/login?error=expired", url.origin));
  }

  const { data } = await supabase.auth.getClaims();
  if (data?.claims.sub !== getOwnerUserId()) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=unauthorized", url.origin));
  }

  return NextResponse.redirect(new URL("/", url.origin));
}
