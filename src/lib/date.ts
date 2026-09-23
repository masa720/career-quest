function datePartsInTimezone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

export function daysUntilDate(dateString: string, timezone: string) {
  const today = datePartsInTimezone(new Date(), timezone);
  const [year, month, day] = dateString.split("-").map(Number);
  const todayUtc = Date.UTC(today.year, today.month - 1, today.day);
  const targetUtc = Date.UTC(year, month - 1, day);
  return Math.round((targetUtc - todayUtc) / 86_400_000);
}

export function formatJapaneseDate(dateString: string) {
  const [year, month, day] = dateString.split("-");
  return `${year}/${month}/${day}`;
}
