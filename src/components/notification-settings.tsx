"use client";

import { Bell, BellOff, Send, Smartphone } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import {
  removePushSubscriptionAction,
  saveNotificationSettingsAction,
  savePushSubscriptionAction,
  sendTestNotificationAction,
} from "@/app/notification-actions";

type DeviceState =
  | "checking"
  | "unsupported"
  | "install-required"
  | "denied"
  | "off"
  | "on";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const bytes = window.atob(base64);
  return Uint8Array.from(bytes, (character) => character.charCodeAt(0));
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

export function NotificationSettings({
  initialEnabled,
  initialMorningTime,
  initialEveningTime,
}: {
  initialEnabled: boolean;
  initialMorningTime: string;
  initialEveningTime: string;
}) {
  const [deviceState, setDeviceState] = useState<DeviceState>("checking");
  const [enabled, setEnabled] = useState(initialEnabled);
  const [morningTime, setMorningTime] = useState(initialMorningTime.slice(0, 5));
  const [eveningTime, setEveningTime] = useState(initialEveningTime.slice(0, 5));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    let active = true;

    async function inspectDevice() {
      try {
        if (
          !("serviceWorker" in navigator) ||
          !("PushManager" in window) ||
          !("Notification" in window) ||
          !vapidPublicKey
        ) {
          if (active) setDeviceState("unsupported");
          return;
        }
        if (isIos() && !isStandalone()) {
          if (active) setDeviceState("install-required");
          return;
        }
        if (Notification.permission === "denied") {
          if (active) setDeviceState("denied");
          return;
        }

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (active) setDeviceState(subscription ? "on" : "off");
      } catch {
        if (active) setDeviceState("unsupported");
      }
    }

    void inspectDevice();
    return () => {
      active = false;
    };
  }, [vapidPublicKey]);

  const notificationsOn = deviceState === "on" && enabled;

  function enableNotifications() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        if (!vapidPublicKey) throw new Error("通知公開鍵が設定されていません。");
        if (isIos() && !isStandalone()) {
          setDeviceState("install-required");
          return;
        }

        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setDeviceState(permission === "denied" ? "denied" : "off");
          return;
        }

        const registration = await navigator.serviceWorker.ready;
        const subscription =
          (await registration.pushManager.getSubscription()) ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          }));
        const json = subscription.toJSON();
        if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
          throw new Error("ブラウザから通知先情報を取得できませんでした。");
        }

        const subscriptionResult = await savePushSubscriptionAction({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
          userAgent: navigator.userAgent,
        });
        if (!subscriptionResult.ok) throw new Error(subscriptionResult.error);

        const settingsResult = await saveNotificationSettingsAction({
          enabled: true,
          morningTime,
          eveningTime,
        });
        if (!settingsResult.ok) throw new Error(settingsResult.error);

        setEnabled(true);
        setDeviceState("on");
        setMessage("この端末の通知を有効にしました。");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "通知を有効にできませんでした。");
      }
    });
  }

  function disableNotifications() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          const result = await removePushSubscriptionAction(subscription.endpoint);
          if (!result.ok) throw new Error(result.error);
          await subscription.unsubscribe();
        }
        const settingsResult = await saveNotificationSettingsAction({
          enabled: false,
          morningTime,
          eveningTime,
        });
        if (!settingsResult.ok) throw new Error(settingsResult.error);

        setEnabled(false);
        setDeviceState("off");
        setMessage("通知をオフにしました。");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "通知を解除できませんでした。");
      }
    });
  }

  function saveTimes() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await saveNotificationSettingsAction({
        enabled,
        morningTime,
        eveningTime,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("通知時刻を保存しました。");
    });
  }

  function sendTest() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await sendTestNotificationAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("テスト通知を送信しました。");
    });
  }

  return (
    <section className="notification-settings" aria-labelledby="notification-heading">
      <div className="notification-settings-heading">
        <Bell size={16} aria-hidden="true" />
        <strong id="notification-heading">通知</strong>
        <span className={notificationsOn ? "is-on" : undefined}>
          {notificationsOn ? "ON" : "OFF"}
        </span>
      </div>

      {deviceState === "install-required" && (
        <p className="notification-guide">
          <Smartphone size={15} aria-hidden="true" />
          iPhoneの共有メニューから「ホーム画面に追加」し、そのアイコンから開いてください。
        </p>
      )}
      {deviceState === "denied" && (
        <p className="notification-guide">
          iPhoneの設定 → 通知 → CareerQuest から通知を許可してください。
        </p>
      )}
      {deviceState === "unsupported" && (
        <p className="notification-guide">この環境ではWeb Pushを利用できません。</p>
      )}

      {(deviceState === "off" || deviceState === "on") && (
        <>
          <div className="notification-times">
            <label>
              <span>朝</span>
              <input
                type="time"
                value={morningTime}
                onChange={(event) => setMorningTime(event.target.value)}
              />
            </label>
            <label>
              <span>夜</span>
              <input
                type="time"
                value={eveningTime}
                onChange={(event) => setEveningTime(event.target.value)}
              />
            </label>
          </div>
          <div className="notification-buttons">
            {notificationsOn ? (
              <button type="button" onClick={disableNotifications} disabled={isPending}>
                <BellOff size={14} aria-hidden="true" /> オフにする
              </button>
            ) : (
              <button type="button" onClick={enableNotifications} disabled={isPending}>
                <Bell size={14} aria-hidden="true" /> 通知を有効にする
              </button>
            )}
            <button type="button" onClick={saveTimes} disabled={isPending || !enabled}>
              時刻を保存
            </button>
            <button type="button" onClick={sendTest} disabled={isPending || deviceState !== "on"}>
              <Send size={14} aria-hidden="true" /> テスト
            </button>
          </div>
        </>
      )}

      {error && <p className="notification-error" role="alert">{error}</p>}
      {message && <p className="notification-success" role="status">{message}</p>}
    </section>
  );
}
