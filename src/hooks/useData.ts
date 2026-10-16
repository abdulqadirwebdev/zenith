import { useLiveQuery } from "dexie-react-hooks";
import { db, defaults } from "../db";
export const usePrefs = () =>
  useLiveQuery(() => db.preferences.get("main")) ?? defaults;
export const useTasks = () =>
  useLiveQuery(() => db.tasks.orderBy("order").toArray()) ?? [];
export const useSessions = () =>
  useLiveQuery(() => db.sessions.toArray()) ?? [];
export const useEvents = () =>
  useLiveQuery(() => db.events.orderBy("start").toArray()) ?? [];
