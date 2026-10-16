import { beforeEach, describe, it, expect } from "vitest";
import { db, defaults, makeTask, completeTask, deleteTasks } from "../db";
import {
  elapsedSeconds,
  pauseState,
  resumeState,
  startTimer,
  finishTimer,
} from "./timer";
import { planDay, overlaps } from "./scheduler";
import { exportBackup, validateBackup, importBackup } from "./backup";
import { streak, csv } from "../utils/analytics";
import type { TimerState, CalendarEvent, Session } from "../types";
beforeEach(async () => {
  await db.open();
  await db.transaction("rw", db.tables, async () => {
    for (const table of db.tables) await table.clear();
  });
  await db.preferences.put({ ...defaults, onboarded: true });
});
const timer: TimerState = {
  id: "t",
  kind: "focus",
  mode: "Custom",
  duration: 1500,
  elapsed: 20,
  startedAt: 1000,
  created: 1000,
  running: true,
};
describe("wall-clock timer", () => {
  it("accounts for background elapsed time and clamps at zero and duration", () => {
    expect(elapsedSeconds(timer, 11000)).toBe(30);
    expect(elapsedSeconds(timer, 0)).toBe(20);
    expect(elapsedSeconds(timer, 1e9)).toBe(1500);
  });
  it("preserves elapsed while paused and resumes from a new timestamp", () => {
    const paused = pauseState(timer, 11000);
    expect(elapsedSeconds(paused, 300000)).toBe(30);
    expect(elapsedSeconds(resumeState(paused, 300000), 310000)).toBe(40);
  });
  it("records duration and XP exactly once, including concurrent completion", async () => {
    const task = makeTask("Read", 25);
    await db.tasks.add(task);
    const t = await startTimer(25, task.id);
    await db.timers.update(t.id, { startedAt: Date.now() - 120000 });
    await Promise.all([finishTimer(t.id), finishTimer(t.id)]);
    expect(await db.sessions.count()).toBe(1);
    expect((await db.tasks.get(task.id))!.actual).toBeCloseTo(2, 1);
    expect(
      await db.rewards.filter((r) => r.id.startsWith("session:")).count(),
    ).toBe(1);
    expect(await db.timers.count()).toBe(0);
  });
  it("does not award a reward for an incomplete session", async () => {
    const t = await startTimer(25);
    await db.timers.update(t.id, { startedAt: Date.now() - 120000 });
    await finishTimer(t.id, false);
    expect(await db.rewards.count()).toBe(0);
    expect((await db.sessions.get(t.id))!.completed).toBe(false);
  });
});
describe("deterministic planning", () => {
  const date = new Date(2030, 0, 7);
  const at = (h: number, m = 0) => +new Date(2030, 0, 7, h, m);
  const prefs = {
    ...defaults,
    workHours: defaults.workHours.map(() => ({
      enabled: true,
      start: "09:00",
      end: "12:00",
    })),
  };
  const event: CalendarEvent = {
    id: "locked",
    title: "Class",
    start: at(10),
    end: at(11),
    kind: "appointment",
    locked: true,
    color: "#888888",
    allDay: false,
    recurrence: "none",
  };
  it("respects work hours, locked events, block limits and breaks", () => {
    const task = makeTask("Study", 90);
    const result = planDay([task], [event], prefs, date, at(8));
    expect(result.blocks.some((b) => b.kind === "break")).toBe(true);
    for (const block of result.blocks) {
      expect(block.start).toBeGreaterThanOrEqual(at(9));
      expect(block.end).toBeLessThanOrEqual(at(12));
      expect(overlaps(block, event)).toBe(false);
      if (block.kind === "study")
        expect((block.end - block.start) / 60000).toBeLessThanOrEqual(
          prefs.focus,
        );
    }
    for (let i = 0; i < result.blocks.length; i++)
      for (let j = i + 1; j < result.blocks.length; j++)
        expect(overlaps(result.blocks[i], result.blocks[j])).toBe(false);
    expect(event.start).toBe(at(10));
  });
  it("orders urgent tasks first and explains overflow", () => {
    const low = { ...makeTask("Later", 300), priority: "low" as const };
    const urgent = { ...makeTask("Urgent", 25), priority: "urgent" as const };
    const result = planDay([low, urgent], [], prefs, date, at(8));
    expect(result.blocks[0].taskId).toBe(urgent.id);
    expect(result.unscheduled[0].taskId).toBe(low.id);
    expect(result.unscheduled[0].reason.length).toBeGreaterThan(5);
  });
  it("excludes already scheduled tasks and disabled workdays", () => {
    const t = makeTask("Read", 20);
    expect(
      planDay([t], [{ ...event, taskId: t.id }], prefs, date, at(8)).blocks,
    ).toHaveLength(0);
    const p = {
      ...prefs,
      workHours: prefs.workHours.map((h) => ({ ...h, enabled: false })),
    };
    const result = planDay([t], [], p, date, at(8));
    expect(result.blocks).toHaveLength(0);
    expect(result.unscheduled).toHaveLength(1);
  });
  it("treats touching intervals as non-overlapping", () =>
    expect(overlaps({ start: 1, end: 2 }, { start: 2, end: 3 })).toBe(false));
});
describe("data integrity", () => {
  it("rejects missing or invalid task estimates", () => {
    expect(() => makeTask("Read", 0)).toThrow();
    expect(() => makeTask("Read", NaN)).toThrow();
    expect(() => makeTask("", 20)).toThrow();
  });
  it("prevents repeat completion XP farming", async () => {
    const t = makeTask("Read", 20);
    await db.tasks.add(t);
    await completeTask(t.id, true);
    await completeTask(t.id, false);
    await completeTask(t.id, true);
    expect(await db.rewards.count()).toBe(1);
    expect((await db.rewards.toArray())[0].xp).toBe(20);
  });
  it("detaches references on deletion", async () => {
    const t = makeTask("Read", 20);
    await db.tasks.add(t);
    const timer = await startTimer(20, t.id);
    await deleteTasks([t.id]);
    expect((await db.timers.get(timer.id))?.taskId).toBeUndefined();
  });
  it("round trips versioned backups and rejects invalid, duplicate and orphan data", async () => {
    const t = makeTask("Read", 20);
    await db.tasks.add(t);
    const backup = await exportBackup();
    expect(validateBackup(backup).tasks[0].title).toBe("Read");
    await importBackup(backup);
    expect(await db.tasks.count()).toBe(1);
    expect(() => validateBackup({ ...backup, version: 99 })).toThrow();
    expect(() =>
      validateBackup({ ...backup, tasks: [{ ...t, estimate: -1 }] }),
    ).toThrow();
    expect(() => validateBackup({ ...backup, tasks: [t, t] })).toThrow();
    expect(() =>
      validateBackup({
        ...backup,
        notes: [
          {
            id: "n",
            title: "n",
            body: "",
            subject: "",
            updated: 1,
            taskId: "missing",
          },
        ],
      }),
    ).toThrow();
  });
  it("neutralizes CSV formula injection", () =>
    expect(csv([["=1+1", 'a"b']])).toContain("'=1+1"));
});
it("calculates a streak with yesterday grace and local dates", () => {
  const now = new Date(2030, 0, 10, 12);
  const make = (day: number): Session => ({
    id: String(day),
    kind: "focus",
    subject: "General",
    start: +new Date(2030, 0, day, 9),
    end: +new Date(2030, 0, day, 10),
    minutes: 60,
    completed: true,
  });
  expect(streak([make(9), make(8), make(7)], now)).toBe(3);
  expect(streak([make(8)], now)).toBe(0);
  expect(streak([], now)).toBe(0);
});
