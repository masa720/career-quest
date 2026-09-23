import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getOwnerUserId, getSupabaseAuthConfig } from "./auth-config";

export async function createAuthServerClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseAuthConfig();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot write cookies. proxy.ts refreshes them.
        }
      },
    },
  });
}

export async function requireOwner() {
  const supabase = await createAuthServerClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || data?.claims.sub !== getOwnerUserId()) {
    throw new Error("この操作には所有者としてのログインが必要です。");
  }

  return data.claims;
}
