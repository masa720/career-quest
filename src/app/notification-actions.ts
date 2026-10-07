"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  removePushSubscription,
  requestTestNotification,
  savePushSubscription,
} from "@/server/notifications/mutations";
import { updateNotificationSettings } from "@/server/settings/mutations";

export type NotificationActionResult =
  | { ok: true }
  | { ok: false; error: string };

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const settingsSchema = z.object({
  enabled: z.boolean(),
  morningTime: timeSchema,
  eveningTime: timeSchema,
});
const endpointSchema = z
  .url()
  .max(4096)
  .refine((value) => new URL(value).protocol === "https:");
const subscriptionSchema = z.object({
  endpoint: endpointSchema,
  keys: z.object({
    p256dh: z.string().min(20).max(1000),
    auth: z.string().min(8).max(500),
  }),
  userAgent: z.string().max(500).optional(),
});
function actionError(error: unknown, fallback: string): NotificationActionResult {
  return { ok: false, error: error instanceof Error ? error.message : fallback };
}

export async function saveNotificationSettingsAction(
  input: unknown,
): Promise<NotificationActionResult> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "通知時刻を確認してください。" };

  try {
    await updateNotificationSettings(parsed.data);
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return actionError(error, "通知設定を保存できませんでした。");
  }
}

export async function savePushSubscriptionAction(
  input: unknown,
): Promise<NotificationActionResult> {
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "通知先の情報が正しくありません。" };

  try {
    await savePushSubscription(parsed.data);
    return { ok: true };
  } catch (error) {
    return actionError(error, "この端末を登録できませんでした。");
  }
}

export async function removePushSubscriptionAction(
  input: unknown,
): Promise<NotificationActionResult> {
  const parsed = endpointSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "通知先の情報が正しくありません。" };

  try {
    await removePushSubscription(parsed.data);
    return { ok: true };
  } catch (error) {
    return actionError(error, "この端末の通知を解除できませんでした。");
  }
}

export async function sendTestNotificationAction(): Promise<NotificationActionResult> {
  try {
    await requestTestNotification();
    return { ok: true };
  } catch (error) {
    return actionError(error, "テスト通知を送信できませんでした。");
  }
}
