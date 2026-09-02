export const SALES_CALL_TIMEZONE = "Asia/Kuala_Lumpur";
export const SALES_CALL_DURATION_MINUTES = 30;
export const SALES_CALL_HOURS = [10, 14, 16] as const;

const weekday = new Set(["Mon", "Tue", "Wed", "Thu", "Fri"]);

export function isAllowedSalesCallSlot(startAt: Date) {
  if (Number.isNaN(startAt.getTime()) || startAt.getUTCSeconds() !== 0 || startAt.getUTCMilliseconds() !== 0) return false;
  const values = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: SALES_CALL_TIMEZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(startAt).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));

  return weekday.has(values.weekday) && values.minute === "00" && SALES_CALL_HOURS.includes(Number(values.hour) as typeof SALES_CALL_HOURS[number]);
}

export function buildAvailableSalesCallSlots(now: Date, occupiedStarts: Iterable<string>, limit = 18) {
  const occupied = new Set(Array.from(occupiedStarts, (value) => new Date(value).toISOString()));
  const slots: string[] = [];
  const malaysiaNow = new Date(now.getTime() + 8 * 3_600_000);

  for (let dayOffset = 1; dayOffset <= 14 && slots.length < limit; dayOffset += 1) {
    const calendarDay = new Date(Date.UTC(malaysiaNow.getUTCFullYear(), malaysiaNow.getUTCMonth(), malaysiaNow.getUTCDate() + dayOffset));
    if (calendarDay.getUTCDay() === 0 || calendarDay.getUTCDay() === 6) continue;
    const datePart = `${calendarDay.getUTCFullYear()}-${String(calendarDay.getUTCMonth() + 1).padStart(2, "0")}-${String(calendarDay.getUTCDate()).padStart(2, "0")}`;
    for (const hour of SALES_CALL_HOURS) {
      const slot = new Date(`${datePart}T${String(hour).padStart(2, "0")}:00:00+08:00`).toISOString();
      if (!occupied.has(slot)) slots.push(slot);
      if (slots.length >= limit) break;
    }
  }

  return slots;
}
