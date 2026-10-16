export type Status =
  "backlog" | "planned" | "in progress" | "paused" | "completed";
export type Priority = "low" | "medium" | "high" | "urgent";
export interface Task {
  id: string;
  title: string;
  description: string;
  subject: string;
  priority: Priority;
  estimate: number;
  actual: number;
  due: string;
  scheduledStart?: number;
  status: Status;
  tags: string[];
  subtasks: { id: string; title: string; done: boolean }[];
  notes: string;
  recurrence: "none" | "daily" | "weekly";
  color: string;
  created: number;
  completed?: number;
  archived: boolean;
  order: number;
}
export interface CalendarEvent {
  id: string;
  title: string;
  start: number;
  end: number;
  taskId?: string;
  kind: "study" | "break" | "appointment";
  locked: boolean;
  color: string;
  allDay: boolean;
  recurrence: "none" | "daily" | "weekly";
}
export interface Session {
  id: string;
  taskId?: string;
  subject: string;
  start: number;
  end: number;
  minutes: number;
  completed: boolean;
  kind: "focus" | "break";
}
export interface TimerState {
  id: string;
  taskId?: string;
  kind: "focus" | "break";
  mode: string;
  duration: number;
  elapsed: number;
  startedAt: number | null;
  created: number;
  running: boolean;
}
export interface Preferences {
  id: "main";
  name: string;
  role: string;
  onboarded: boolean;
  theme: "dark" | "light" | "system";
  accent: string;
  focus: number;
  shortBreak: number;
  longBreak: number;
  longAfter: number;
  target: number;
  autoBreak: boolean;
  autoFocus: boolean;
  reducedMotion: boolean;
  compact: boolean;
  orbs: boolean;
  clock24: boolean;
  weekStart: 0 | 1;
  gamification: boolean;
  notifications: boolean;
  deadlineNotifications: boolean;
  sessionNotifications: boolean;
  goalNotifications: boolean;
  tick: boolean;
  completionSound: boolean;
  volume: number;
  keepAwake: boolean;
  pauseAudio: boolean;
  minBlock: number;
  maxBlock: number;
  breakEvery: number;
  workHours: { enabled: boolean; start: string; end: string }[];
  widgets: string[];
  hiddenWidgets: string[];
}
export interface Note {
  id: string;
  title: string;
  body: string;
  subject: string;
  taskId?: string;
  updated: number;
}
export interface Flashcard {
  id: string;
  deck: string;
  front: string;
  back: string;
  due: number;
  interval: number;
  reviews: number;
}
export interface Exam {
  id: string;
  title: string;
  date: string;
  target: number;
  progress: number;
}
export interface Reward {
  id: string;
  xp: number;
  created: number;
}
export interface Notice {
  id: string;
  title: string;
  body: string;
  created: number;
  read: boolean;
}
export interface Track {
  id: string;
  name: string;
  blob: Blob;
  favorite: boolean;
  lastPlayed: number;
  playlist: string;
}
export interface Mix {
  id: string;
  name: string;
  levels: Record<string, number>;
}
