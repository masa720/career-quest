import "server-only";

import { getOwnerUserId } from "@/lib/supabase/auth-config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
};

export async function savePushSubscription(input: PushSubscriptionInput) {
  const supabase = await createServerSupabaseClient();
  const now = new Date().toISOString();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: getOwnerUserId(),
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      user_agent: input.userAgent?.slice(0, 500) || null,
      last_seen_at: now,
      revoked_at: null,
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    console.error("savePushSubscription", error);
    throw new Error("この端末を通知先として登録できませんでした。");
  }
}

export async function removePushSubscription(endpoint: string) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", getOwnerUserId());

  if (error) {
    console.error("removePushSubscription", error);
    throw new Error("通知先を解除できませんでした。");
  }
}

export async function requestTestNotification() {
  const supabase = await createServerSupabaseClient();
  const { data: settings, error } = await supabase
    .from("app_settings")
    .select("notification_function_url, notification_cron_secret")
    .eq("id", 1)
    .single();

  if (error || !settings?.notification_function_url) {
    throw new Error("先に通知設定を保存してください。");
  }

  const response = await fetch(settings.notification_function_url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "test",
      cron_secret: settings.notification_cron_secret,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("requestTestNotification", response.status, body);
    throw new Error("テスト通知を送信できませんでした。");
  }
}
