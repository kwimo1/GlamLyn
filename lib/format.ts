import { BRAND } from "@/lib/brand";

const currencyFormatter = new Intl.NumberFormat(BRAND.locale, {
  style: "currency",
  currency: "DZD",
  maximumFractionDigits: 0,
});

const longDateFormatter = new Intl.DateTimeFormat(BRAND.locale, {
  dateStyle: "full",
  timeZone: BRAND.timezone,
});

const shortDateFormatter = new Intl.DateTimeFormat(BRAND.locale, {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: BRAND.timezone,
});

const timeFormatter = new Intl.DateTimeFormat(BRAND.locale, {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: BRAND.timezone,
});

export function formatCurrencyDzd(value: number) {
  return currencyFormatter.format(value);
}

export function formatDuration(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (!remainder) {
    return `${hours} h`;
  }

  return `${hours} h ${remainder.toString().padStart(2, "0")}`;
}

export function formatLongDate(value: string) {
  return longDateFormatter.format(new Date(value));
}

export function formatShortDate(value: string) {
  return shortDateFormatter.format(new Date(value));
}

export function formatTime(value: string) {
  return timeFormatter.format(new Date(value));
}

export function formatDateTimeCompact(value: string) {
  return `${formatShortDate(value)} · ${formatTime(value)}`;
}
