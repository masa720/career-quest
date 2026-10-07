import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AppSettings = {
  id: number;
  visa_expiry_date: string | null;
  timezone: string;
  notifications_enabled: boolean;
  morning_notification_time: string;
  evening_notification_time: string;
  updated_at: string;
};

export async function getSettings(): Promise<AppSettings> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("app_settings")
    .select(
      "id, visa_expiry_date, timezone, notifications_enabled, morning_notification_time, evening_notification_time, updated_at",
    )
    .eq("id", 1)
    .single();

  // Keep the existing app usable while the push-notification migration is
  // being deployed. Notification writes still require the migration.
  if (error?.code === "42703") {
    const { data: legacySettings, error: legacyError } = await supabase
      .from("app_settings")
      .select("id, visa_expiry_date, timezone, updated_at")
      .eq("id", 1)
      .single();

    if (!legacyError && legacySettings) {
      return {
        ...legacySettings,
        notifications_enabled: false,
        morning_notification_time: "08:30:00",
        evening_notification_time: "20:30:00",
      };
    }
  }

  if (error) {
    console.error("getSettings", error);
    throw new Error("設定を取得できませんでした。");
  }

  return data;
}
