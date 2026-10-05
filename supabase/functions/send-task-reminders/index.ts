import { send, type Subscription } from "@daaku/webpush";
import { createClient } from "@supabase/supabase-js";

type ReminderMode = "scheduled" | "test";
type ReminderType = "morning" | "evening" | "test";

type AppSettings = {
  timezone: string;
  notifications_enabled: boolean;
  morning_notification_time: string;
  evening_notification_time: string;
  notification_cron_secret: string;
};

type PushSubscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type Task = {
  scheduled_for: string | null;
  is_daily: boolean;
  is_completed: boolean;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function getServiceRoleKey() {
  const keyMap = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (keyMap) {
    try {
      const parsed = JSON.parse(keyMap) as Record<string, string>;
      if (parsed.default) return parsed.default;
    } catch {
      // Fall back to the legacy secret below.
    }
  }

  return (
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    Deno.env.get("SUPABASE_SECRET_KEY")
  );
}

function localDateTime(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    minutes: Number(part("hour")) * 60 + Number(part("minute")),
  };
}

function configuredMinutes(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

function isDue(nowMinutes: number, configuredTime: string) {
  const elapsed = nowMinutes - configuredMinutes(configuredTime);
  return elapsed >= 0 && elapsed < 10;
}

function daysBetween(earlier: string, later: string) {
  const start = Date.parse(`${earlier}T00:00:00Z`);
  const end = Date.parse(`${later}T00:00:00Z`);
  return Math.max(0, Math.floor((end - start) / 86_400_000));
}

function payloadFor(
  type: ReminderType,
  total: number,
  carryoverCount: number,
) {
  if (type === "test") {
    return {
      title: "🔔 CareerQuest",
      body: "通知は正常に届いています。明日も一歩進もう。",
      tag: "careerquest-test",
      url: "/?source=push&type=test",
    };
  }

  if (type === "morning") {
    const carryover = carryoverCount > 0
      ? ` うち${carryoverCount}件は持ち越しです。`
      : "";
    return {
      title: "🎯 今日のCareerQuest",
      body: `未完了タスクは${total}件。${carryover}今日こそ片づけよう。`,
      tag: "careerquest-morning",
      url: "/?source=push&type=morning",
    };
  }

  return {
    title: `🌙 まだ${total}件残っています`,
    body: "今日をゼロで終わらせない。寝る前にひとつ完了しよう。",
    tag: "careerquest-evening",
    url: "/?source=push&type=evening",
  };
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = getServiceRoleKey();
  const vapidPrivateJwk = Deno.env.get("VAPID_PRIVATE_JWK");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT");
  if (!supabaseUrl || !serviceRoleKey || !vapidPrivateJwk || !vapidSubject) {
    return jsonResponse({ error: "Function secrets are incomplete" }, 500);
  }

  let input: { mode?: ReminderMode; cron_secret?: string };
  try {
    input = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }
  if (input.mode !== "scheduled" && input.mode !== "test") {
    return jsonResponse({ error: "Invalid mode" }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: settings, error: settingsError } = await supabase
    .from("app_settings")
    .select(
      "timezone, notifications_enabled, morning_notification_time, evening_notification_time, notification_cron_secret",
    )
    .eq("id", 1)
    .single<AppSettings>();

  if (settingsError || !settings) {
    console.error("settings", settingsError);
    return jsonResponse({ error: "Settings unavailable" }, 500);
  }
  if (!input.cron_secret || input.cron_secret !== settings.notification_cron_secret) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  if (input.mode === "scheduled" && !settings.notifications_enabled) {
    return jsonResponse({ skipped: "notifications disabled" });
  }

  const { error: rolloverError } = await supabase.rpc("rollover_daily_tasks");
  if (rolloverError) {
    console.error("daily task rollover", rolloverError);
    return jsonResponse({ error: "Daily tasks unavailable" }, 500);
  }

  const local = localDateTime(settings.timezone);
  let notificationType: ReminderType = "test";
  if (input.mode === "scheduled") {
    if (isDue(local.minutes, settings.morning_notification_time)) {
      notificationType = "morning";
    } else if (isDue(local.minutes, settings.evening_notification_time)) {
      notificationType = "evening";
    } else {
      return jsonResponse({ skipped: "not due" });
    }
  }

  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("scheduled_for, is_daily, is_completed")
    .is("deleted_at", null)
    .eq("is_completed", false)
    .returns<Task[]>();
  if (tasksError) {
    console.error("tasks", tasksError);
    return jsonResponse({ error: "Tasks unavailable" }, 500);
  }

  const dueTasks = (tasks ?? []).filter(
    (task) =>
      task.is_daily ||
      (task.scheduled_for !== null && task.scheduled_for <= local.date),
  );
  if (input.mode === "scheduled" && dueTasks.length === 0) {
    return jsonResponse({ skipped: "no unfinished tasks" });
  }
  const carryoverCount = dueTasks.filter(
    (task) =>
      !task.is_daily &&
      task.scheduled_for !== null &&
      daysBetween(task.scheduled_for, local.date) > 0,
  ).length;

  const { data: subscriptions, error: subscriptionsError } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .is("revoked_at", null)
    .returns<PushSubscription[]>();
  if (subscriptionsError) {
    console.error("subscriptions", subscriptionsError);
    return jsonResponse({ error: "Subscriptions unavailable" }, 500);
  }

  const pushPayload = payloadFor(
    notificationType,
    dueTasks.length,
    carryoverCount,
  );
  const vapid = JSON.parse(vapidPrivateJwk) as JsonWebKey;
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const subscription of subscriptions ?? []) {
    let deliveryId: string | null = null;
    if (notificationType !== "test") {
      const { data: delivery, error: deliveryError } = await supabase
        .from("notification_deliveries")
        .insert({
          subscription_id: subscription.id,
          notification_type: notificationType,
          local_date: local.date,
        })
        .select("id")
        .single();
      if (deliveryError?.code === "23505") {
        const { data: existingDelivery } = await supabase
          .from("notification_deliveries")
          .select("id, status, created_at")
          .eq("subscription_id", subscription.id)
          .eq("notification_type", notificationType)
          .eq("local_date", local.date)
          .single();
        const isStalePending =
          existingDelivery?.status === "pending" &&
          Date.now() - Date.parse(existingDelivery.created_at) > 4 * 60_000;
        if (existingDelivery?.status === "failed" || isStalePending) {
          deliveryId = existingDelivery.id;
          await supabase
            .from("notification_deliveries")
            .update({
              status: "pending",
              error_message: null,
              created_at: new Date().toISOString(),
            })
            .eq("id", deliveryId);
        } else {
          skipped += 1;
          continue;
        }
      }
      if (deliveryError && deliveryError.code !== "23505") {
        console.error("delivery claim", deliveryError);
        failed += 1;
        continue;
      }
      if (!deliveryId) deliveryId = delivery?.id ?? null;
      if (!deliveryId) {
        failed += 1;
        continue;
      }
    }

    try {
      const pushSubscription: Subscription = {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      };
      await send(pushSubscription, JSON.stringify(pushPayload), {
        vapid,
        subscriber: vapidSubject,
        ttl: 60 * 60,
        urgency: "normal",
        topic: `careerquest-${notificationType}-${local.date}`,
      });
      sent += 1;
      if (deliveryId) {
        await supabase
          .from("notification_deliveries")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", deliveryId);
      }
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error("push", subscription.id, message);
      if (deliveryId) {
        await supabase
          .from("notification_deliveries")
          .update({ status: "failed", error_message: message.slice(0, 500) })
          .eq("id", deliveryId);
      }
      if (
        typeof error === "object" &&
        error !== null &&
        "permanent" in error &&
        error.permanent === true
      ) {
        await supabase
          .from("push_subscriptions")
          .update({ revoked_at: new Date().toISOString() })
          .eq("id", subscription.id);
      }
    }
  }

  const responseBody = {
    notificationType,
    taskCount: dueTasks.length,
    subscriptions: subscriptions?.length ?? 0,
    sent,
    skipped,
    failed,
  };
  if (input.mode === "test" && sent === 0) {
    return jsonResponse(
      {
        ...responseBody,
        error: subscriptions?.length
          ? "Test notification failed"
          : "No active subscriptions",
      },
      subscriptions?.length ? 502 : 409,
    );
  }
  return jsonResponse(responseBody);
});
