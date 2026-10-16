import { format, isToday, startOfWeek } from "date-fns";
import { db } from "../db";
import { streak } from "../utils/analytics";
export async function updateMilestones() {
  const p = await db.preferences.get("main");
  if (!p) return;
  const sessions = await db.sessions.toArray();
  const focus = sessions.filter(
    (s) => s.kind === "focus" && s.completed && s.minutes >= 1,
  );
  const taskRewards = await db.rewards
    .filter((r) => r.id.startsWith("task:"))
    .count();
  const tests: [string, string, boolean][] = [
    ["First Focus", "Your first focused step.", focus.length > 0],
    [
      "Early Bird",
      "A focused start to the day.",
      focus.some((s) => new Date(s.end).getHours() < 9),
    ],
    [
      "Night Owl",
      "A quiet evening well spent.",
      focus.some((s) => new Date(s.end).getHours() >= 21),
    ],
    ["Five-Day Streak", "Five days of showing up.", streak(sessions) >= 5],
    [
      "Deep Work Champion",
      "Ninety minutes of deep work.",
      focus.some((s) => s.minutes >= 90),
    ],
    ["100 Tasks Completed", "One hundred steps forward.", taskRewards >= 100],
  ];
  await db.transaction("rw", [db.rewards, db.notices], async () => {
    if (p.gamification)
      for (const [name, body, earned] of tests) {
        const id = "achievement:" + name;
        if (earned && !(await db.rewards.get(id))) {
          await db.rewards.add({ id, xp: 0, created: Date.now() });
          await db.notices.put({
            id,
            title: name + " unlocked",
            body,
            created: Date.now(),
            read: false,
          });
        }
      }
    if (p.goalNotifications) {
      const today = sessions
        .filter((s) => s.kind === "focus" && isToday(s.end))
        .reduce((n, s) => n + s.minutes, 0);
      const week = sessions
        .filter(
          (s) =>
            s.kind === "focus" &&
            s.end >= +startOfWeek(new Date(), { weekStartsOn: p.weekStart }),
        )
        .reduce((n, s) => n + s.minutes, 0);
      for (const [key, earned, title] of [
        ["daily", today >= p.target, "Daily focus target reached"],
        ["weekly", week >= p.target * 5, "Weekly focus target reached"],
      ] as const) {
        const id =
          key +
          ":" +
          format(
            key === "daily"
              ? new Date()
              : startOfWeek(new Date(), { weekStartsOn: p.weekStart }),
            "yyyy-MM-dd",
          );
        if (earned && !(await db.notices.get(id)))
          await db.notices.add({
            id,
            title,
            body: "Your consistent effort is adding up.",
            created: Date.now(),
            read: false,
          });
      }
    }
  });
}
