import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

export function createServerSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "SUPABASE_URL と SUPABASE_SECRET_KEY を設定してください。",
    );
  }

  return createClient<Database>(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
