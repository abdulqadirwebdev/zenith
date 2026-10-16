import { db } from "../db";
import { updateMilestones } from "./milestones";
import { expandedEvents } from "./scheduler";
export async function checkReminders() {
  await updateMilestones();
  const p = await db.preferences.get("main");
  if (!p) return;
  const now = Date.now();
  const upcoming = p.sessionNotifications
    ? expandedEvents(await db.events.toArray(), now, now + 5 * 60000).filter(
        (e) => e.start >= now,
      )
    : [];
  const tasks = p.deadlineNotifications
    ? await db.tasks
        .filter(
          (t) =>
            !!t.due &&
            t.status !== "completed" &&
            !t.archived &&
            +new Date(t.due) >= now &&
            +new Date(t.due) <= now + 86400000,
        )
        .toArray()
    : [];
  for (const item of [
    ...upcoming.map((e) => ({
      id: "event:" + e.id + ":" + e.start,
      title: "Upcoming session",
      body: e.title,
    })),
    ...tasks.map((t) => ({
      id: "deadline:" + t.id + ":" + t.due,
      title: "Deadline approaching",
      body: t.title,
    })),
  ]) {
    const created = await db.transaction("rw", db.notices, async () => {
      if (await db.notices.get(item.id)) return false;
      await db.notices.add({ ...item, created: now, read: false });
      return true;
    });
    if (
      created &&
      p.notifications &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      try {
        new Notification(item.title, { body: item.body });
      } catch {
        /* In-app notice remains available. */
      }
    }
  }
}
