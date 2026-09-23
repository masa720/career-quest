import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function updateSettings(visaExpiryDate: string | null) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("app_settings")
    .update({ visa_expiry_date: visaExpiryDate })
    .eq("id", 1)
    .select()
    .single();

  if (error) {
    console.error("updateSettings", error);
    throw new Error("ビザ期限を更新できませんでした。");
  }

  return data;
}
