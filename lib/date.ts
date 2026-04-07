import { addDays, addMinutes, differenceInHours, formatISO, isBefore } from "date-fns";
import { BRAND } from "@/lib/brand";
import type { AvailabilitySlot, Booking, BusinessSettings, OpeningHour } from "@/lib/types";

const ALGIERS_OFFSET = "+01:00";

export function makeAlgiersDate(date: string, time: string) {
  return new Date(`${date}T${time}:00${ALGIERS_OFFSET}`);
}

export function toIso(date: Date) {
  return formatISO(date);
}

export function nextDays(count: number) {
  const today = new Date();
  return Array.from({ length: count }, (_, index) => addDays(today, index));
}

export function getDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BRAND.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";

  return `${year}-${month}-${day}`;
}

export function getDayIndex(date: Date) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: BRAND.timezone,
    weekday: "short",
  }).format(date);

  const map = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return map.indexOf(weekday);
}

export function canSelfManageBooking(
  booking: Booking,
  settings: BusinessSettings,
  now = new Date(),
) {
  return differenceInHours(new Date(booking.startsAt), now) >= settings.selfServiceChangeHours;
}

export function getOpeningForDate(openingHours: OpeningHour[], date: Date) {
  const day = getDayIndex(date);
  return openingHours.find((entry) => entry.day === day) ?? null;
}

export function computeSlotsForDate({
  date,
  durationMinutes,
  settings,
  bookings,
  stepMinutes = 15,
}: {
  date: Date;
  durationMinutes: number;
  settings: BusinessSettings;
  bookings: Booking[];
  stepMinutes?: number;
}): AvailabilitySlot[] {
  const dateKey = getDateKey(date);
  if (settings.closedDates.includes(dateKey)) {
    return [];
  }

  const opening = getOpeningForDate(settings.openingHours, date);
  if (!opening?.open || !opening.close) {
    return [];
  }

  const start = makeAlgiersDate(dateKey, opening.open);
  const end = makeAlgiersDate(dateKey, opening.close);
  const latestStart = addMinutes(end, -durationMinutes);

  if (isBefore(latestStart, start)) {
    return [];
  }

  const now = addMinutes(new Date(), settings.bookingLeadHours * 60);
  const activeBookings = bookings.filter(
    (booking) => booking.status === "confirmed" && getDateKey(new Date(booking.startsAt)) === dateKey,
  );

  const slots: AvailabilitySlot[] = [];
  let cursor = start;

  while (!isBefore(latestStart, cursor)) {
    const slotEnd = addMinutes(cursor, durationMinutes);
    const isPastLeadTime = isBefore(cursor, now);
    const clashes = activeBookings.some((booking) => {
      const bookingStart = new Date(booking.startsAt);
      const bookingEnd = new Date(booking.endsAt);
      return cursor < bookingEnd && slotEnd > bookingStart;
    });

    if (!isPastLeadTime && !clashes) {
      const startsAt = toIso(cursor);
      slots.push({
        startsAt,
        endsAt: toIso(slotEnd),
        dateLabel: new Intl.DateTimeFormat(BRAND.locale, {
          weekday: "long",
          day: "numeric",
          month: "long",
          timeZone: BRAND.timezone,
        }).format(cursor),
        timeLabel: new Intl.DateTimeFormat(BRAND.locale, {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: BRAND.timezone,
        }).format(cursor),
      });
    }

    cursor = addMinutes(cursor, stepMinutes);
  }

  return slots;
}
