"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DOCTOR_ID,
  WEEKDAY_OPTIONS,
  addDays,
  addMonths,
  buildMonthGrid,
  buildSlotRange,
  formatDateInput,
  getMonthKey,
  getMonthTitle,
  formatTimeDisplay,
  startOfMonth,
} from "@/lib/schedule";

type WeeklyScheduleRow = {
  id: number;
  weekday: number;
  time_slot: string;
  is_active: boolean;
};

type AvailabilitySlot = {
  id: number;
  time_slot: string;
  is_active: boolean;
};

type BookingSlot = {
  id: number;
  time_slot: string;
  patients: { name: string };
};

type MonthSummary = {
  date: string;
  openSlots: number;
  confirmedBookings: number;
  isBlocked: boolean;
  isWeeklyOff?: boolean;
};

type DayState = {
  enabled: boolean;
  start: string;
  end: string;
  interval: number;
  slots: string[];
  manual: string;
};

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = { success: false; error: string };
type PublishRange = "week" | "month" | "year";

const DEFAULT_DAY_STATE: DayState = {
  enabled: false,
  start: "17:00",
  end: "21:00",
  interval: 30,
  slots: [],
  manual: "",
};

function createInitialPattern() {
  return WEEKDAY_OPTIONS.reduce<Record<number, DayState>>((acc, day) => {
    acc[day.value] = { ...DEFAULT_DAY_STATE };
    return acc;
  }, {});
}

function parsePayload<T>(payload: ApiSuccess<T> | ApiFailure) {
  if (!payload.success) {
    throw new Error(payload.error);
  }
  return payload.data;
}

function normalizeTimeString(value: string) {
  return value.slice(11, 16);
}

function inferPatternSettings(slots: string[]) {
  if (slots.length === 0) {
    return { start: "17:00", end: "21:00", interval: 30 };
  }

  const minutes = slots.map((slot) => {
    const [hours, mins] = slot.split(":").map(Number);
    return hours * 60 + mins;
  });
  const interval = minutes.length > 1 ? minutes[1] - minutes[0] : 30;
  const endMinutes = minutes[minutes.length - 1] + interval;
  const endHours = Math.floor(endMinutes / 60) % 24;
  const endMins = endMinutes % 60;

  return {
    start: slots[0],
    end: `${String(endHours).padStart(2, "0")}:${String(endMins).padStart(2, "0")}`,
    interval,
  };
}

export function AdminSchedulePage() {
  const today = useMemo(() => new Date(), []);
  const todayKey = formatDateInput(today);
  const [pattern, setPattern] = useState<Record<number, DayState>>(
    createInitialPattern,
  );
  const [weeklyLoading, setWeeklyLoading] = useState(true);
  const [weeklyError, setWeeklyError] = useState("");
  const [weeklyNotice, setWeeklyNotice] = useState("");

  const [sharedStart, setSharedStart] = useState("17:00");
  const [sharedEnd, setSharedEnd] = useState("21:00");
  const [sharedInterval, setSharedInterval] = useState(30);
  const [generateStart, setGenerateStart] = useState(formatDateInput(today));
  const [publishRange, setPublishRange] = useState<PublishRange>("month");
  const [generateNotice, setGenerateNotice] = useState("");
  const [generateError, setGenerateError] = useState("");
  const [generating, setGenerating] = useState(false);

  const [selectedDate, setSelectedDate] = useState(formatDateInput(today));
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(today));
  const [monthSummary, setMonthSummary] = useState<Record<string, MonthSummary>>(
    {},
  );
  const [monthLoading, setMonthLoading] = useState(true);
  const [monthError, setMonthError] = useState("");
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [confirmedBookings, setConfirmedBookings] = useState<BookingSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState("");
  const [dayActionNotice, setDayActionNotice] = useState("");
  const [dayActionError, setDayActionError] = useState("");
  const [manualDateSlot, setManualDateSlot] = useState("17:00");

  useEffect(() => {
    void loadWeeklySchedule();
  }, []);

  useEffect(() => {
    void loadDayView(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    void loadMonthSummary(visibleMonth);
  }, [visibleMonth]);

  useEffect(() => {
    const selected = new Date(`${selectedDate}T00:00:00`);
    if (
      selected.getFullYear() !== visibleMonth.getFullYear() ||
      selected.getMonth() !== visibleMonth.getMonth()
    ) {
      setVisibleMonth(startOfMonth(selected));
    }
  }, [selectedDate, visibleMonth]);

  async function loadWeeklySchedule() {
    setWeeklyLoading(true);
    setWeeklyError("");

    try {
      const response = await fetch(
        `/api/admin/weekly-schedule?doctor_id=${DOCTOR_ID}`,
      );
      const payload = (await response.json()) as
        | ApiSuccess<WeeklyScheduleRow[]>
        | ApiFailure;
      const rows = parsePayload(payload);

      const nextPattern = createInitialPattern();
      for (const row of rows) {
        const key = row.weekday;
        nextPattern[key] = {
          ...nextPattern[key],
          enabled: true,
          slots: [...nextPattern[key].slots, normalizeTimeString(row.time_slot)],
        };
      }

      for (const key of Object.keys(nextPattern)) {
        nextPattern[Number(key)].slots.sort();
      }

      const firstWorkingDay = WEEKDAY_OPTIONS.find(
        (day) => nextPattern[day.value].slots.length > 0,
      );
      if (firstWorkingDay) {
        const settings = inferPatternSettings(
          nextPattern[firstWorkingDay.value].slots,
        );
        setSharedStart(settings.start);
        setSharedEnd(settings.end);
        setSharedInterval(settings.interval);
      }
      setPattern(nextPattern);
    } catch (error) {
      setWeeklyError(
        error instanceof Error ? error.message : "Could not load schedule",
      );
    } finally {
      setWeeklyLoading(false);
    }
  }

  async function loadDayView(date: string) {
    setSlotsLoading(true);
    setSlotsError("");

    try {
      const [slotsResponse, bookingsResponse] = await Promise.all([
        fetch(
          `/api/availability?doctor_id=${DOCTOR_ID}&date=${date}&available_only=false`,
        ),
        fetch(
          `/api/bookings?doctor_id=${DOCTOR_ID}&date=${date}&status=confirmed`,
        ),
      ]);

      const slotsPayload = (await slotsResponse.json()) as
        | ApiSuccess<AvailabilitySlot[]>
        | ApiFailure;
      const bookingsPayload = (await bookingsResponse.json()) as
        | ApiSuccess<BookingSlot[]>
        | ApiFailure;

      setSlots(parsePayload(slotsPayload));
      setConfirmedBookings(parsePayload(bookingsPayload));
    } catch (error) {
      setSlotsError(
        error instanceof Error ? error.message : "Could not load day view",
      );
    } finally {
      setSlotsLoading(false);
    }
  }

  async function loadMonthSummary(month: Date) {
    setMonthLoading(true);
    setMonthError("");

    try {
      const response = await fetch(
        `/api/admin/schedule-summary?doctor_id=${DOCTOR_ID}&month=${getMonthKey(month)}`,
      );
      const payload = (await response.json()) as
        | ApiSuccess<MonthSummary[]>
        | ApiFailure;
      const rows = parsePayload(payload);
      setMonthSummary(
        rows.reduce<Record<string, MonthSummary>>((accumulator, row) => {
          accumulator[row.date] = row;
          return accumulator;
        }, {}),
      );
    } catch (error) {
      setMonthError(
        error instanceof Error ? error.message : "Could not load month summary",
      );
    } finally {
      setMonthLoading(false);
    }
  }

  function setDay(day: number, update: Partial<DayState>) {
    setPattern((current) => ({
      ...current,
      [day]: { ...current[day], ...update },
    }));
  }

  function toggleWorkingDay(day: number) {
    setDay(day, { enabled: !pattern[day].enabled });
  }

  async function saveWeeklyPattern({
    showNotice = true,
  }: {
    showNotice?: boolean;
  } = {}) {
    setWeeklyNotice("");
    setWeeklyError("");

    try {
      const sharedSlots = buildSlotRange(
        sharedStart,
        sharedEnd,
        sharedInterval,
      );
      const hasWorkingDays = WEEKDAY_OPTIONS.some(
        (day) => pattern[day.value].enabled,
      );
      if (!hasWorkingDays) {
        throw new Error("Choose at least one working day.");
      }
      if (sharedSlots.length === 0) {
        throw new Error("End time must be later than start time.");
      }

      const entries = WEEKDAY_OPTIONS.map((day) => ({
        weekday: day.value,
        time_slots: pattern[day.value].enabled ? sharedSlots : [],
        is_active: true,
      }));

      const response = await fetch("/api/admin/weekly-schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctor_id: DOCTOR_ID, entries }),
      });

      const payload = (await response.json()) as
        | ApiSuccess<WeeklyScheduleRow[]>
        | ApiFailure;
      parsePayload(payload);

      if (showNotice) {
        setWeeklyNotice(
          `Weekly pattern saved for ${entries.filter((entry) => entry.time_slots.length > 0).length} working day(s).`,
        );
      }
      await loadWeeklySchedule();
      await loadMonthSummary(visibleMonth);
      return true;
    } catch (error) {
      setWeeklyError(
        error instanceof Error ? error.message : "Could not save schedule",
      );
      return false;
    }
  }

  async function generateSlots() {
    setGenerating(true);
    setGenerateError("");
    setGenerateNotice("");

    try {
      const saved = await saveWeeklyPattern({ showNotice: false });
      if (!saved) return;

      const startDate = new Date(`${generateStart}T00:00:00`);
      const rangeEnd =
        publishRange === "week"
          ? addDays(startDate, 6)
          : addDays(
              addMonths(startDate, publishRange === "month" ? 1 : 12),
              -1,
            );
      const endDate = formatDateInput(rangeEnd);
      const response = await fetch("/api/admin/availability/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: DOCTOR_ID,
          start_date: generateStart,
          end_date: endDate,
        }),
      });
      const payload = (await response.json()) as
        | ApiSuccess<{ count: number; message?: string }>
        | ApiFailure;
      const result = parsePayload(payload);
      setGenerateNotice(
        result.count > 0
          ? `Published ${result.count} new bookable slots through ${endDate}.`
          : "No new slots were added. This period may already be published.",
      );
      await loadDayView(selectedDate);
      await loadMonthSummary(visibleMonth);
    } catch (error) {
      setGenerateError(
        error instanceof Error ? error.message : "Could not generate slots",
      );
    } finally {
      setGenerating(false);
    }
  }

  function hoursLabel(day: DayState) {
    if (!day.enabled) return "Off";
    return `${sharedStart}–${sharedEnd}`;
  }

  function formatSelectedDayLabel(dateKey: string) {
    return new Date(`${dateKey}T00:00:00`).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }

  function slotTimeLabel(value: string) {
    return normalizeTimeString(value) || formatTimeDisplay(new Date(value));
  }

  async function addDateSlot() {
    setDayActionError("");
    setDayActionNotice("");

    try {
      const response = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: DOCTOR_ID,
          date: selectedDate,
          time_slot: manualDateSlot,
        }),
      });
      const payload = (await response.json()) as ApiSuccess<unknown> | ApiFailure;
      parsePayload(payload);
      setDayActionNotice("Slot added.");
      await loadDayView(selectedDate);
      await loadMonthSummary(visibleMonth);
    } catch (error) {
      setDayActionError(
        error instanceof Error ? error.message : "Could not add slot",
      );
    }
  }

  async function updateSlot(slotId: number, isActive: boolean) {
    setDayActionError("");
    setDayActionNotice("");

    try {
      const response = await fetch(`/api/availability/${slotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: isActive }),
      });
      const payload = (await response.json()) as ApiSuccess<unknown> | ApiFailure;
      parsePayload(payload);
      setDayActionNotice(isActive ? "Slot re-opened." : "Slot deactivated.");
      await loadDayView(selectedDate);
      await loadMonthSummary(visibleMonth);
    } catch (error) {
      setDayActionError(
        error instanceof Error ? error.message : "Could not update slot",
      );
    }
  }

  async function deleteSlot(slotId: number) {
    setDayActionError("");
    setDayActionNotice("");

    try {
      const response = await fetch(`/api/availability/${slotId}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as ApiSuccess<unknown> | ApiFailure;
      parsePayload(payload);
      setDayActionNotice("Slot removed.");
      await loadDayView(selectedDate);
      await loadMonthSummary(visibleMonth);
    } catch (error) {
      setDayActionError(
        error instanceof Error ? error.message : "Could not remove slot",
      );
    }
  }

  async function blockDay() {
    setDayActionError("");
    setDayActionNotice("");

    try {
      const response = await fetch("/api/admin/availability/block-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: DOCTOR_ID,
          date: selectedDate,
          action: "block",
        }),
      });
      const payload = (await response.json()) as
        | ApiSuccess<{ blocked: number; protected_booked_slots: number }>
        | ApiFailure;
      const result = parsePayload(payload);
      setDayActionNotice(
        `Blocked ${result.blocked} slots. Protected booked slots: ${result.protected_booked_slots}.`,
      );
      await loadDayView(selectedDate);
      await loadMonthSummary(visibleMonth);
    } catch (error) {
      setDayActionError(
        error instanceof Error ? error.message : "Could not block the day",
      );
    }
  }

  async function unblockDay() {
    setDayActionError("");
    setDayActionNotice("");

    try {
      const response = await fetch("/api/admin/availability/block-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: DOCTOR_ID,
          date: selectedDate,
          action: "unblock",
        }),
      });
      const payload = (await response.json()) as
        | ApiSuccess<{ unblocked: number; created?: number }>
        | ApiFailure;
      const result = parsePayload(payload);
      setDayActionNotice(
        result.unblocked > 0
          ? result.created && result.created > 0
            ? `Opened this day with ${result.created} slots from your weekly hours.`
            : `Unblocked ${result.unblocked} slots. This day is open again.`
          : "No blocked slots to reopen on this day.",
      );
      await loadDayView(selectedDate);
      await loadMonthSummary(visibleMonth);
    } catch (error) {
      setDayActionError(
        error instanceof Error ? error.message : "Could not unblock the day",
      );
    }
  }

  function isBooked(timeSlot: string) {
    return confirmedBookings.find(
      (booking) => normalizeTimeString(booking.time_slot) === normalizeTimeString(timeSlot),
    );
  }

  const monthCells = useMemo(() => buildMonthGrid(visibleMonth), [visibleMonth]);
  const openSlotCount = slots.filter((slot) => slot.is_active && !isBooked(slot.time_slot)).length;
  const bookedCount = confirmedBookings.length;
  const freeSlots = slots.filter((slot) => !isBooked(slot.time_slot));
  const selectedSummary = monthSummary[selectedDate];
  const selectedDayWeeklyOff = Boolean(selectedSummary?.isWeeklyOff);
  const selectedDayBlocked =
    Boolean(selectedSummary?.isBlocked) ||
    (freeSlots.length > 0 && freeSlots.every((slot) => !slot.is_active));

  return (
    <>
      <div className="page-head">
        <div className="eyebrow">Manage</div>
        <h1>Schedule</h1>
        <p>Set your weekly hours, generate slots, and manage individual days.</p>
      </div>

      <div className="card weekly">
        <div className="weekly-head">
          <div>
            <h2>1. Choose your working days</h2>
            <p className="schedule-help">
              Click a day to switch it on or off. The same hours will apply to
              every green day.
            </p>
          </div>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => void saveWeeklyPattern()}
            disabled={weeklyLoading}
          >
            Save
          </button>
        </div>

        <div className="week-row">
          {WEEKDAY_OPTIONS.map((day) => {
            const state = pattern[day.value];
            const on = state.enabled;
            return (
              <button
                key={day.value}
                type="button"
                className={`wd ${on ? "on" : "off"}`}
                aria-pressed={on}
                onClick={() => toggleWorkingDay(day.value)}
              >
                <div className="wd-name">{day.shortLabel.toUpperCase()}</div>
                <div className="wd-hours">{hoursLabel(state)}</div>
                <div className="wd-state">{on ? "Working" : "Off"}</div>
              </button>
            );
          })}
        </div>

        <div className="shared-pattern">
          <div>
            <h2>2. Set the hours for working days</h2>
            <p className="schedule-help">
              These hours and appointment length apply to every selected day.
            </p>
          </div>
          <div className="shared-pattern-grid">
            <label>
              <span>Start time</span>
              <input
                type="time"
                value={sharedStart}
                onChange={(event) => setSharedStart(event.target.value)}
              />
            </label>
            <label>
              <span>End time</span>
              <input
                type="time"
                value={sharedEnd}
                onChange={(event) => setSharedEnd(event.target.value)}
              />
            </label>
            <label>
              <span>Appointment length</span>
              <select
                value={sharedInterval}
                onChange={(event) =>
                  setSharedInterval(Number(event.target.value))
                }
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </label>
          </div>
          <div className="pattern-preview">
            <strong>Preview:</strong>{" "}
            {buildSlotRange(sharedStart, sharedEnd, sharedInterval).join(", ") ||
              "Choose a valid start and end time."}
          </div>
        </div>

        {weeklyError ? <p className="notice-err">{weeklyError}</p> : null}
        {weeklyNotice ? <p className="notice-ok">{weeklyNotice}</p> : null}

        <div className="publish-panel">
          <div>
            <h2>3. Publish bookable appointments</h2>
            <p className="schedule-help">
              Create real slots patients can book, using the saved weekly
              pattern.
            </p>
          </div>
          <div className="gen-row">
            <span>Starting</span>
            <input
              type="date"
              value={generateStart}
              onChange={(event) => setGenerateStart(event.target.value)}
            />
            <span>publish for</span>
            <select
              value={publishRange}
              onChange={(event) =>
                setPublishRange(event.target.value as PublishRange)
              }
            >
              <option value="week">1 week</option>
              <option value="month">1 month</option>
              <option value="year">1 year</option>
            </select>
            <button
              type="button"
              className="btn sm"
              onClick={() => void generateSlots()}
              disabled={generating || weeklyLoading}
            >
              {generating ? "Publishing..." : "Publish slots"}
            </button>
          </div>
          <p className="publish-hint">
            Existing slots and booked appointments are never duplicated or
            overwritten.
          </p>
          {generateNotice ? (
            <p className="notice-ok">{generateNotice}</p>
          ) : null}
          {generateError ? (
            <p className="notice-err">{generateError}</p>
          ) : null}
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="cal-head">
            <button
              type="button"
              className="cal-nav"
              aria-label="Previous month"
              onClick={() => setVisibleMonth((current) => addMonths(current, -1))}
            >
              ‹
            </button>
            <strong>{getMonthTitle(visibleMonth)}</strong>
            <button
              type="button"
              className="cal-nav"
              aria-label="Next month"
              onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
            >
              ›
            </button>
          </div>

          {monthError ? <p className="notice-err">{monthError}</p> : null}

          <div className="cal-grid">
            {["M", "T", "W", "T", "F", "S", "S"].map((label, index) => (
              <div key={`${label}-${index}`} className="dow">
                {label}
              </div>
            ))}

            {monthLoading
              ? Array.from({ length: 42 }).map((_, index) => (
                  <div key={`skeleton-${index}`} className="cday dim">
                    ·
                  </div>
                ))
              : monthCells.map((date) => {
                  const dateKey = formatDateInput(date);
                  const summary = monthSummary[dateKey];
                  const isSelected = dateKey === selectedDate;
                  const isToday = dateKey === todayKey;
                  const isCurrentMonth =
                    date.getMonth() === visibleMonth.getMonth() &&
                    date.getFullYear() === visibleMonth.getFullYear();
                  const isPast = dateKey < todayKey;
                  const cellBlocked = Boolean(summary?.isBlocked);
                  const open = summary?.openSlots ?? 0;
                  const booked = summary?.confirmedBookings ?? 0;
                  const classes = [
                    "cday",
                    !isCurrentMonth || isPast ? "dim" : "",
                    isToday ? "today" : "",
                    isSelected ? "selected" : "",
                    cellBlocked ? "blocked" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <button
                      key={dateKey}
                      type="button"
                      className={classes}
                      disabled={isPast && !isSelected}
                      onClick={() => setSelectedDate(dateKey)}
                    >
                      {date.getDate()}
                      {summary && (open > 0 || booked > 0) ? (
                        <div className="mini-counts">
                          {open > 0 ? <span className="open-c">{open}</span> : null}
                          {open > 0 && booked > 0 ? " · " : null}
                          {booked > 0 ? <span className="book-c">{booked}</span> : null}
                        </div>
                      ) : null}
                    </button>
                  );
                })}
          </div>

          <div className="legend">
            <span>
              <span className="dot" style={{ background: "var(--sage)" }} />
              Open slots
            </span>
            <span>
              <span className="dot" style={{ background: "var(--rose)" }} />
              Booked
            </span>
            <span>
              <span className="dot" style={{ background: "#b5b9b2" }} />
              Blocked / Off
            </span>
            <span>
              <span className="dot" style={{ background: "var(--sage-deep)" }} />
              Today
            </span>
          </div>
        </div>

        <div className="card day-detail">
          <h2>{formatSelectedDayLabel(selectedDate)}</h2>
          <div className="sub">
            {slotsLoading
              ? "Loading slots..."
              : selectedDayBlocked
                ? selectedDayWeeklyOff
                  ? "Weekly Off day — blocked"
                  : "This day is blocked"
                : `${openSlotCount} open slots · ${bookedCount} booked`}
          </div>

          {slotsError ? <p className="notice-err">{slotsError}</p> : null}
          {dayActionNotice ? <p className="notice-ok">{dayActionNotice}</p> : null}
          {dayActionError ? <p className="notice-err">{dayActionError}</p> : null}

          <div className="slot-list">
            {!slotsLoading && !slotsError && slots.length === 0 ? (
              <p className="sub" style={{ marginBottom: 0 }}>
                No availability has been generated for this day yet.
              </p>
            ) : null}

            {slots.map((slot) => {
              const booked = isBooked(slot.time_slot);
              const time = slotTimeLabel(slot.time_slot);

              if (booked) {
                return (
                  <div key={slot.id} className="slot-chip booked">
                    <span className="lock" aria-hidden="true">
                      🔒
                    </span>
                    {time}
                    <span className="booked-tag">Booked</span>
                  </div>
                );
              }

              if (!slot.is_active) {
                return (
                  <div key={slot.id} className="slot-chip inactive">
                    {time}
                    <button
                      type="button"
                      className="reactivate"
                      onClick={() => void updateSlot(slot.id, true)}
                    >
                      Activate
                    </button>
                    <button
                      type="button"
                      className="x"
                      aria-label={`Remove ${time}`}
                      onClick={() => void deleteSlot(slot.id)}
                    >
                      ×
                    </button>
                  </div>
                );
              }

              return (
                <div key={slot.id} className="slot-chip">
                  {time}
                  <button
                    type="button"
                    className="x"
                    aria-label={`Remove ${time}`}
                    onClick={() => void deleteSlot(slot.id)}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>

          <div className="add-slot">
            <input
              type="time"
              value={manualDateSlot}
              onChange={(event) => setManualDateSlot(event.target.value)}
              className="mono"
            />
            <button type="button" className="btn sm" onClick={() => void addDateSlot()}>
              + Add slot
            </button>
          </div>

          <div className="day-actions">
            {selectedDayBlocked ? (
              <>
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => void unblockDay()}
                >
                  Unblock this day
                </button>
                <span className="hint">
                  {selectedDayWeeklyOff
                    ? "Opens this Off day once using your weekly hours"
                    : "Reopens all blocked slots for booking"}
                </span>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn danger sm"
                  onClick={() => void blockDay()}
                  disabled={slots.length === 0}
                >
                  Block this day
                </button>
                <span className="hint">Booked slots stay protected</span>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
