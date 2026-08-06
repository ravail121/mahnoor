export const DOCTOR_ID = 1;

export const WEEKDAY_OPTIONS = [
  { value: 1, label: "Monday", shortLabel: "Mon" },
  { value: 2, label: "Tuesday", shortLabel: "Tue" },
  { value: 3, label: "Wednesday", shortLabel: "Wed" },
  { value: 4, label: "Thursday", shortLabel: "Thu" },
  { value: 5, label: "Friday", shortLabel: "Fri" },
  { value: 6, label: "Saturday", shortLabel: "Sat" },
  { value: 0, label: "Sunday", shortLabel: "Sun" },
] as const;

export type WeekdayValue = (typeof WEEKDAY_OPTIONS)[number]["value"];

export function padTime(value: number) {
  return String(value).padStart(2, "0");
}

export function formatTimeInput(date: Date) {
  return `${padTime(date.getUTCHours())}:${padTime(date.getUTCMinutes())}`;
}

export function formatTimeDisplay(date: Date) {
  return date.toLocaleTimeString("en-PK", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
}

export function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = padTime(date.getMonth() + 1);
  const day = padTime(date.getDate());
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months, 1);
  return next;
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${padTime(date.getMonth() + 1)}`;
}

export function getMonthTitle(date: Date) {
  return date.toLocaleDateString("en-PK", {
    month: "long",
    year: "numeric",
  });
}

export function isSameDate(a: Date, b: Date) {
  return formatDateInput(a) === formatDateInput(b);
}

export function buildMonthGrid(month: Date) {
  const start = startOfMonth(month);
  const gridStart = addDays(start, -((start.getDay() + 6) % 7));
  const cells: Date[] = [];

  for (let index = 0; index < 42; index += 1) {
    cells.push(addDays(gridStart, index));
  }

  return cells;
}

export function getGreetingLabel(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function buildSlotRange(
  start: string,
  end: string,
  intervalMinutes: number,
) {
  if (!start || !end || intervalMinutes <= 0) return [];

  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);

  if (
    [startHour, startMinute, endHour, endMinute].some((value) =>
      Number.isNaN(value),
    )
  ) {
    return [];
  }

  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;
  if (endTotal <= startTotal) return [];

  const slots: string[] = [];
  for (let total = startTotal; total < endTotal; total += intervalMinutes) {
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    slots.push(`${padTime(hours)}:${padTime(minutes)}`);
  }

  return slots;
}

export function getWeekdayLabel(weekday: number) {
  return (
    WEEKDAY_OPTIONS.find((option) => option.value === weekday)?.label ?? "Day"
  );
}
