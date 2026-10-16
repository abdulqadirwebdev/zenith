import Dexie, { type Table } from "dexie";
import { addDays, format } from "date-fns";
import type {
  Task,
  CalendarEvent,
  Session,
  TimerState,
  Preferences,
  Note,
  Flashcard,
  Exam,
  Reward,
  Notice,
  Track,
  Mix,
} from "../types";
export class ZenithDB extends Dexie {
  tasks!: Table<Task>;
  events!: Table<CalendarEvent>;
  sessions!: Table<Session>;
  timers!: Table<TimerState>;
  preferences!: Table<Preferences>;
  notes!: Table<Note>;
  cards!: Table<Flashcard>;
  exams!: Table<Exam>;
  rewards!: Table<Reward>;
  notices!: Table<Notice>;
  tracks!: Table<Track>;
  mixes!: Table<Mix>;
  constructor(name = "zenith-universe") {
    super(name);
    this.version(1).stores({
      tasks: "id,status,subject,due,order",
      events: "id,start,end,taskId",
      sessions: "id,start,taskId",
      timers: "id",
      preferences: "id",
      notes: "id,subject",
      cards: "id,deck,due",
      exams: "id",
      rewards: "id",
      notices: "id,created",
      tracks: "id",
      mixes: "id",
    });
    this.version(2)
      .stores({ tasks: "id,status,subject,due,order,archived" })
      .upgrade((tx) =>
        tx
          .table("tasks")
          .toCollection()
          .modify((t) => {
            t.archived ??= false;
          }),
      );
  }
}
export const db = new ZenithDB();
export const defaults: Preferences = {
  id: "main",
  name: "Explorer",
  role: "student",
  onboarded: false,
  theme: "dark",
  accent: "#8B5CF6",
  focus: 25,
  shortBreak: 5,
  longBreak: 20,
  longAfter: 4,
  target: 120,
  autoBreak: false,
  autoFocus: false,
  reducedMotion: false,
  compact: false,
  orbs: true,
  clock24: false,
  weekStart: 1,
  gamification: true,
  notifications: false,
  deadlineNotifications: true,
  sessionNotifications: true,
  goalNotifications: true,
  tick: false,
  completionSound: true,
  volume: 0.5,
  keepAwake: false,
  pauseAudio: false,
  minBlock: 15,
  maxBlock: 50,
  breakEvery: 1,
  workHours: Array.from({ length: 7 }, (_, i) => ({
    enabled: i !== 0 && i !== 6,
    start: "09:00",
    end: "18:00",
  })),
  widgets: ["focus", "stats", "tasks", "weekly", "calendar", "achievements"],
  hiddenWidgets: [],
};
export async function initialize() {
  if (!(await db.preferences.get("main"))) await db.preferences.put(defaults);
}
export const uid = () => crypto.randomUUID();
export function makeTask(title: string, estimate: number): Task {
  if (!title.trim() || !Number.isFinite(estimate) || estimate <= 0)
    throw Error("A title and a positive time estimate are required.");
  return {
    id: uid(),
    title: title.trim(),
    description: "",
    subject: "General",
    priority: "medium",
    estimate,
    actual: 0,
    due: "",
    status: "backlog",
    tags: [],
    subtasks: [],
    notes: "",
    recurrence: "none",
    color: "#8B5CF6",
    created: Date.now(),
    archived: false,
    order: Date.now(),
  };
}
export async function deleteTasks(ids: string[]) {
  await db.transaction(
    "rw",
    [db.tasks, db.events, db.sessions, db.notes, db.timers],
    async () => {
      await db.tasks.bulkDelete(ids);
      const detach = (x: { taskId?: string }) => {
        if (x.taskId && ids.includes(x.taskId)) delete x.taskId;
      };
      await db.events.toCollection().modify(detach);
      await db.sessions.toCollection().modify(detach);
      await db.notes.toCollection().modify(detach);
      await db.timers.toCollection().modify(detach);
    },
  );
}
export async function completeTask(id: string, done: boolean) {
  await db.transaction(
    "rw",
    [db.tasks, db.rewards, db.preferences],
    async () => {
      const t = await db.tasks.get(id);
      if (!t) return;
      await db.tasks.update(id, {
        status: done ? "completed" : "backlog",
        completed: done ? Date.now() : undefined,
      });
      if (
        done &&
        t.recurrence !== "none" &&
        !(await db.rewards.get("recurrence:" + id))
      ) {
        const nextDate = addDays(
          t.due ? new Date(t.due) : new Date(),
          t.recurrence === "daily" ? 1 : 7,
        );
        await db.tasks.add({
          ...t,
          id: uid(),
          status: "backlog",
          actual: 0,
          completed: undefined,
          scheduledStart: undefined,
          archived: false,
          created: Date.now(),
          order: Date.now(),
          due: format(
            nextDate,
            t.due.includes("T") ? "yyyy-MM-dd'T'HH:mm" : "yyyy-MM-dd",
          ),
          subtasks: t.subtasks.map((s) => ({ ...s, id: uid(), done: false })),
        });
        await db.rewards.add({
          id: "recurrence:" + id,
          xp: 0,
          created: Date.now(),
        });
      }
      if (
        done &&
        (await db.preferences.get("main"))?.gamification &&
        !(await db.rewards.get("task:" + id))
      )
        await db.rewards.add({ id: "task:" + id, xp: 20, created: Date.now() });
    },
  );
}
export async function seedDemo() {
  if (await db.tasks.count()) return;
  await db.tasks.bulkAdd(
    [
      ["Review calculus chapter 4", 45, "Mathematics"],
      ["Draft research introduction", 60, "Literature"],
      ["Practice cell biology flashcards", 25, "Biology"],
    ].map(([title, estimate, subject], i) => ({
      ...makeTask(String(title), Number(estimate)),
      subject: String(subject),
      priority: i === 0 ? ("high" as const) : ("medium" as const),
      due: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    })),
  );
}
