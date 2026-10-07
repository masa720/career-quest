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

export async function updateNotificationSettings(input: {
  enabled: boolean;
  morningTime: string;
  eveningTime: string;
}) {
  const supabase = await createServerSupabaseClient();
  const projectUrl = process.env.SUPABASE_URL;
  if (!projectUrl) throw new Error("SUPABASE_URLを設定してください。");

  const { data, error } = await supabase
    .from("app_settings")
    .update({
      notifications_enabled: input.enabled,
      morning_notification_time: input.morningTime,
      evening_notification_time: input.eveningTime,
      notification_function_url: `${projectUrl}/functions/v1/send-task-reminders`,
    })
    .eq("id", 1)
    .select(
      "notifications_enabled, morning_notification_time, evening_notification_time",
    )
    .single();

  if (error) {
    console.error("updateNotificationSettings", error);
    throw new Error("通知設定を更新できませんでした。");
  }

  return data;
}
