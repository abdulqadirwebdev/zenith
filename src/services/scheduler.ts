import { startOfDay, addDays } from "date-fns";
import type { CalendarEvent, Preferences, Task } from "../types";
export const overlaps = (
  a: { start: number; end: number },
  b: { start: number; end: number },
) => a.start < b.end && b.start < a.end;
export function expandedEvents(
  events: CalendarEvent[],
  from: number,
  to: number,
) {
  const result: CalendarEvent[] = [];
  for (const event of events) {
    if (event.recurrence === "none") {
      if (event.end > from && event.start < to) result.push(event);
      continue;
    }
    let start = new Date(event.start);
    for (let n = 0; n < 5000 && +start < to; n++) {
      const end = +start + (event.end - event.start);
      if (end > from) result.push({ ...event, start: +start, end });
      start = addDays(start, event.recurrence === "daily" ? 1 : 7);
    }
  }
  return result;
}
export function workWindow(date: Date, p: Preferences) {
  const h = p.workHours[date.getDay()];
  const parse = (v: string) => {
    const [hour, minute] = v.split(":").map(Number);
    const d = startOfDay(date);
    d.setHours(hour, minute);
    return +d;
  };
  return { start: parse(h.start), end: parse(h.end), enabled: h.enabled };
}
export interface Plan {
  blocks: CalendarEvent[];
  unscheduled: {
    taskId: string;
    title: string;
    minutes: number;
    reason: string;
  }[];
  capacity: number;
  workload: number;
}
export function planDay(
  tasks: Task[],
  events: CalendarEvent[],
  prefs: Preferences,
  date: Date,
  now = Date.now(),
): Plan {
  const window = workWindow(date, prefs);
  const begin = Math.max(window.start, now);
  const busy = expandedEvents(
    events,
    +startOfDay(date),
    +addDays(startOfDay(date), 1),
  ).sort((a, b) => a.start - b.start);
  const free: { start: number; end: number }[] = [];
  let cursor = begin;
  for (const e of busy) {
    if (e.end <= cursor || e.start >= window.end) continue;
    if (e.start > cursor)
      free.push({ start: cursor, end: Math.min(e.start, window.end) });
    cursor = Math.max(cursor, e.end);
  }
  if (cursor < window.end) free.push({ start: cursor, end: window.end });
  if (!window.enabled) free.length = 0;
  const candidates = tasks.filter(
    (t) =>
      !t.archived &&
      t.status !== "completed" &&
      !events.some((e) => e.taskId === t.id && e.end > now),
  );
  const rank = { urgent: 0, high: 1, medium: 2, low: 3 };
  candidates.sort(
    (a, b) =>
      rank[a.priority] - rank[b.priority] ||
      (a.due ? +new Date(a.due) : Infinity) -
        (b.due ? +new Date(b.due) : Infinity) ||
      a.order - b.order,
  );
  const result: Plan = {
    blocks: [],
    unscheduled: [],
    capacity: free.reduce((s, x) => s + (x.end - x.start) / 60000, 0),
    workload: candidates.reduce(
      (s, t) => s + Math.max(0, t.estimate - t.actual),
      0,
    ),
  };
  let count = 0;
  let pendingBreak = false;
  for (const t of candidates) {
    let remaining = Math.max(0, t.estimate - t.actual);
    for (const slot of free) {
      while (remaining > 0 && slot.end > slot.start) {
        if (pendingBreak) {
          const end = slot.start + prefs.shortBreak * 60000;
          if (end > slot.end) break;
          result.blocks.push({
            id: `break-${result.blocks.length}`,
            title: "Recharge",
            start: slot.start,
            end,
            kind: "break",
            locked: false,
            color: "#34D399",
            allDay: false,
            recurrence: "none",
          });
          slot.start = end;
          pendingBreak = false;
        }
        const available = (slot.end - slot.start) / 60000;
        const length = Math.min(
          remaining,
          prefs.focus,
          prefs.maxBlock,
          available,
        );
        if (length < Math.min(prefs.minBlock, remaining)) break;
        const end = slot.start + length * 60000;
        if (
          t.due &&
          end > +new Date(t.due.includes("T") ? t.due : t.due + "T23:59:59")
        )
          break;
        result.blocks.push({
          id: `plan-${t.id}-${result.blocks.length}`,
          taskId: t.id,
          title: t.title,
          start: slot.start,
          end,
          kind: "study",
          locked: false,
          color: t.color,
          allDay: false,
          recurrence: "none",
        });
        remaining -= length;
        slot.start = end;
        count++;
        pendingBreak = count % prefs.breakEvery === 0;
      }
    }
    if (remaining > 0.001)
      result.unscheduled.push({
        taskId: t.id,
        title: t.title,
        minutes: remaining,
        reason: !window.enabled
          ? "Working hours are disabled for this day."
          : t.due && +new Date(t.due) < begin
            ? "The deadline has already passed."
            : "No remaining interval meets the block length and deadline constraints.",
      });
  }
  return result;
}
