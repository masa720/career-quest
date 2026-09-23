"use client";

import { useEffect, useMemo, useState } from "react";

type RemainingTime = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  centiseconds: number;
  expired: boolean;
};

function timezoneOffset(timestamp: number, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const representedAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  return representedAsUtc - Math.floor(timestamp / 1000) * 1000;
}

function expiryTimestamp(date: string, timezone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const nextLocalMidnight = Date.UTC(year, month - 1, day + 1);
  let timestamp = nextLocalMidnight - timezoneOffset(nextLocalMidnight, timezone);
  timestamp = nextLocalMidnight - timezoneOffset(timestamp, timezone);
  return timestamp;
}

function remainingUntil(target: number): RemainingTime {
  const difference = target - Date.now();
  const total = Math.max(0, difference);
  const days = Math.floor(total / 86_400_000);
  const hours = Math.floor((total % 86_400_000) / 3_600_000);
  const minutes = Math.floor((total % 3_600_000) / 60_000);
  const seconds = Math.floor((total % 60_000) / 1000);
  const centiseconds = Math.floor((total % 1000) / 10);
  return { days, hours, minutes, seconds, centiseconds, expired: difference <= 0 };
}

const pad = (value: number) => String(value).padStart(2, "0");

export function VisaCountdown({
  expiryDate,
  timezone,
  fallbackDays,
}: {
  expiryDate: string;
  timezone: string;
  fallbackDays: number;
}) {
  const target = useMemo(
    () => expiryTimestamp(expiryDate, timezone),
    [expiryDate, timezone],
  );
  const [remaining, setRemaining] = useState<RemainingTime | null>(null);

  useEffect(() => {
    const update = () => setRemaining(remainingUntil(target));
    update();
    const interval = window.setInterval(update, 50);
    return () => window.clearInterval(interval);
  }, [target]);

  if (remaining?.expired) {
    return <p className="expired">⚠️ ビザ期限を過ぎています</p>;
  }

  const days = remaining?.days ?? Math.max(0, fallbackDays);

  return (
    <p className="countdown" aria-label={`ビザ期限まであと${days}日`}>
      <span className="countdown-prefix">⏳ あと</span>
      <strong>{days}</strong>
      <span className="countdown-day-label">日</span>
      <span className="countdown-clock" aria-hidden="true">
        {remaining
          ? `${pad(remaining.hours)}:${pad(remaining.minutes)}:${pad(remaining.seconds)}.${pad(remaining.centiseconds)}`
          : "00:00:00.00"}
      </span>
    </p>
  );
}
