import { db, uid } from "../db";
import type { TimerState } from "../types";
import { useUI } from "../stores/ui";
import { updateMilestones } from "./milestones";
export function elapsedSeconds(t: TimerState, now = Date.now()) {
  const elapsed =
    t.elapsed +
    (t.running && t.startedAt !== null
      ? Math.max(0, now - t.startedAt) / 1000
      : 0);
  return Math.max(
    0,
    t.mode === "Stopwatch" ? elapsed : Math.min(t.duration, elapsed),
  );
}
export function pauseState(t: TimerState, now = Date.now()): TimerState {
  return {
    ...t,
    elapsed: elapsedSeconds(t, now),
    startedAt: null,
    running: false,
  };
}
export function resumeState(t: TimerState, now = Date.now()): TimerState {
  return { ...t, startedAt: now, running: true };
}
export async function startTimer(
  minutes: number,
  taskId?: string,
  kind: "focus" | "break" = "focus",
  mode = "Custom",
) {
  const current = await db.timers.toCollection().first();
  if (current) throw Error("Finish or reset the current timer first.");
  if (!Number.isFinite(minutes) || minutes <= 0)
    throw Error("Choose a positive duration.");
  if (taskId && !(await db.tasks.get(taskId)))
    throw Error("This task no longer exists.");
  const timer: TimerState = {
    id: uid(),
    taskId,
    kind,
    mode,
    duration: minutes * 60,
    elapsed: 0,
    startedAt: Date.now(),
    created: Date.now(),
    running: true,
  };
  await db.transaction("rw", [db.timers, db.tasks], async () => {
    if (await db.timers.count())
      throw Error("A focus timer is already active.");
    await db.timers.put(timer);
    if (taskId) await db.tasks.update(taskId, { status: "in progress" });
  });
  return timer;
}
export async function toggleTimer() {
  await db.transaction("rw", db.timers, async () => {
    const t = await db.timers.toCollection().first();
    if (t) await db.timers.put(t.running ? pauseState(t) : resumeState(t));
  });
}
export async function finishTimer(
  id: string,
  completed = true,
  now = Date.now(),
) {
  const recorded = await db.transaction(
    "rw",
    [db.timers, db.sessions, db.tasks, db.rewards, db.preferences, db.notices],
    async () => {
      if (await db.sessions.get(id)) return false;
      const t = await db.timers.get(id);
      if (!t) return false;
      const seconds = elapsedSeconds(t, now);
      const task = t.taskId ? await db.tasks.get(t.taskId) : undefined;
      await db.sessions.add({
        id,
        taskId: task?.id,
        subject: task?.subject ?? "General",
        start: t.created,
        end: Math.max(t.created, now),
        minutes: seconds / 60,
        completed,
        kind: t.kind,
      });
      if (task)
        await db.tasks.update(task.id, {
          actual: task.actual + seconds / 60,
          status: task.status === "completed" ? "completed" : "paused",
        });
      const p = await db.preferences.get("main");
      if (completed && t.kind === "focus" && seconds >= 60 && p?.gamification)
        await db.rewards.put({
          id: "session:" + id,
          xp: Math.floor(seconds / 60) * 2,
          created: now,
        });
      await db.timers.delete(id);
      await db.notices.put({
        id: "session:" + id,
        title: completed ? "Session complete" : "Session saved",
        body: `${Math.round(seconds / 60)} minutes of ${t.kind} recorded.`,
        created: now,
        read: false,
      });
      return true;
    },
  );
  if (recorded && completed) {
    useUI.setState({ celebration: id });
    await updateMilestones();
  }
  return recorded;
}
