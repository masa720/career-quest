import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AppSettings = {
  id: number;
  visa_expiry_date: string | null;
  timezone: string;
  updated_at: string;
};

export async function getSettings(): Promise<AppSettings> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("app_settings")
    .select("id, visa_expiry_date, timezone, updated_at")
    .eq("id", 1)
    .single();

  if (error) {
    console.error("getSettings", error);
    throw new Error("設定を取得できませんでした。");
  }

  return data;
}
