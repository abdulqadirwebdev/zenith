import { z } from "zod";
import { db } from "../db";
import type {
  Task,
  CalendarEvent,
  Session,
  Note,
  Flashcard,
  Exam,
  Reward,
  Notice,
  Mix,
  Preferences,
} from "../types";
const num = z.number().finite().nonnegative();
const id = z.string().min(1).max(200);
const str = z.string();
const task = z.object({
  id,
  title: str.min(1),
  description: str,
  subject: str,
  priority: z.enum(["low", "medium", "high", "urgent"]),
  estimate: num.positive(),
  actual: num,
  due: str.refine(
    (v) => v === "" || Number.isFinite(Date.parse(v)),
    "Invalid due date",
  ),
  status: z.enum(["backlog", "planned", "in progress", "paused", "completed"]),
  tags: z.array(str),
  subtasks: z.array(z.object({ id, title: str, done: z.boolean() })),
  notes: str,
  recurrence: z.enum(["none", "daily", "weekly"]),
  color: str.regex(/^#[a-fA-F0-9]{6}$/),
  created: num,
  completed: num.optional(),
  scheduledStart: num.optional(),
  archived: z.boolean(),
  order: num,
});
const event = z
  .object({
    id,
    title: str,
    start: num,
    end: num,
    taskId: id.optional(),
    kind: z.enum(["study", "break", "appointment"]),
    locked: z.boolean(),
    color: str.regex(/^#[a-fA-F0-9]{6}$/),
    allDay: z.boolean(),
    recurrence: z.enum(["none", "daily", "weekly"]),
  })
  .refine((e) => e.end > e.start, "Events must end after they start");
const session = z
  .object({
    id,
    taskId: id.optional(),
    subject: str,
    start: num,
    end: num,
    minutes: num,
    completed: z.boolean(),
    kind: z.enum(["focus", "break"]),
  })
  .refine((s) => s.end >= s.start, "Session dates are invalid");
const preferences = z
  .object({
    id: z.literal("main"),
    name: str,
    role: str,
    onboarded: z.boolean(),
    theme: z.enum(["dark", "light", "system"]),
    accent: z.string().regex(/^#[a-fA-F0-9]{6}$/),
    focus: num.positive().max(1440),
    shortBreak: num.positive().max(1440),
    longBreak: num.positive().max(1440),
    longAfter: num.int().positive(),
    target: num.positive(),
    autoBreak: z.boolean(),
    autoFocus: z.boolean(),
    reducedMotion: z.boolean(),
    compact: z.boolean(),
    orbs: z.boolean(),
    clock24: z.boolean(),
    weekStart: z.union([z.literal(0), z.literal(1)]),
    gamification: z.boolean(),
    notifications: z.boolean(),
    deadlineNotifications: z.boolean(),
    sessionNotifications: z.boolean(),
    goalNotifications: z.boolean(),
    tick: z.boolean(),
    completionSound: z.boolean(),
    volume: num.max(1),
    keepAwake: z.boolean(),
    pauseAudio: z.boolean(),
    minBlock: num.positive(),
    maxBlock: num.positive(),
    breakEvery: num.int().positive(),
    workHours: z
      .array(
        z.object({
          enabled: z.boolean(),
          start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
          end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        }),
      )
      .length(7),
    widgets: z.array(
      z.enum(["focus", "stats", "tasks", "weekly", "calendar", "achievements"]),
    ),
    hiddenWidgets: z.array(str),
  })
  .refine(
    (p) =>
      p.minBlock <= p.maxBlock &&
      p.workHours.every((h) => !h.enabled || h.end > h.start),
    "Invalid scheduling rules",
  );
const backup = z.object({
  version: z.literal(1),
  exportedAt: str,
  tasks: z.array(task),
  events: z.array(event),
  sessions: z.array(session),
  preferences: z.array(preferences).length(1),
  notes: z.array(
    z.object({
      id,
      title: str,
      body: str,
      subject: str,
      taskId: id.optional(),
      updated: num,
    }),
  ),
  cards: z.array(
    z.object({
      id,
      deck: str,
      front: str,
      back: str,
      due: num,
      interval: num,
      reviews: num,
    }),
  ),
  exams: z.array(
    z.object({
      id,
      title: str,
      date: str,
      target: num.positive(),
      progress: num,
    }),
  ),
  rewards: z.array(z.object({ id, xp: num, created: num })),
  notices: z.array(
    z.object({ id, title: str, body: str, created: num, read: z.boolean() }),
  ),
  mixes: z.array(
    z.object({ id, name: str, levels: z.record(str, num.max(1)) }),
  ),
});
export interface Backup {
  version: 1;
  exportedAt: string;
  tasks: Task[];
  events: CalendarEvent[];
  sessions: Session[];
  preferences: Preferences[];
  notes: Note[];
  cards: Flashcard[];
  exams: Exam[];
  rewards: Reward[];
  notices: Notice[];
  mixes: Mix[];
}
export function validateBackup(input: unknown): Backup {
  const result = backup.parse(input);
  const ids = new Set(result.tasks.map((t) => t.id));
  for (const key of [
    "tasks",
    "events",
    "sessions",
    "notes",
    "cards",
    "exams",
    "rewards",
    "notices",
    "mixes",
  ] as const) {
    if (new Set(result[key].map((x) => x.id)).size !== result[key].length)
      throw Error(`Duplicate IDs in ${key}`);
  }
  for (const item of [...result.events, ...result.sessions, ...result.notes])
    if (item.taskId && !ids.has(item.taskId))
      throw Error("Backup contains an orphaned task reference.");
  return result;
}
export async function exportBackup(): Promise<Backup> {
  return db.transaction(
    "r",
    [
      db.tasks,
      db.events,
      db.sessions,
      db.preferences,
      db.notes,
      db.cards,
      db.exams,
      db.rewards,
      db.notices,
      db.mixes,
    ],
    async () => ({
      version: 1,
      exportedAt: new Date().toISOString(),
      tasks: await db.tasks.toArray(),
      events: await db.events.toArray(),
      sessions: await db.sessions.toArray(),
      preferences: await db.preferences.toArray(),
      notes: await db.notes.toArray(),
      cards: await db.cards.toArray(),
      exams: await db.exams.toArray(),
      rewards: await db.rewards.toArray(),
      notices: await db.notices.toArray(),
      mixes: await db.mixes.toArray(),
    }),
  );
}
export async function importBackup(input: unknown) {
  const data = validateBackup(input);
  await db.transaction("rw", db.tables, async () => {
    for (const table of db.tables) {
      if (table.name === "tracks") continue;
      await table.clear();
      if (table.name in data)
        await table.bulkPut(data[table.name as keyof Backup] as never[]);
    }
  });
}
