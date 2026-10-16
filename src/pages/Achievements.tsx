import { useLiveQuery } from "dexie-react-hooks";
import {
  Trophy,
  Sun,
  Moon,
  Flame,
  Mountain,
  CheckCheck,
  Lock,
} from "lucide-react";
import { usePrefs, useSessions, useTasks } from "../hooks/useData";
import { db } from "../db";
import { streak, duration } from "../utils/analytics";
import { PageHeading, Ring } from "../components/ui";
export default function Achievements() {
  const p = usePrefs(),
    sessions = useSessions(),
    tasks = useTasks();
  const rewards = useLiveQuery(() => db.rewards.toArray()) ?? [];
  const total = rewards.reduce((n, r) => n + r.xp, 0);
  const focus = sessions.filter((s) => s.kind === "focus" && s.completed);
  const badges = [
    {
      name: "First Focus",
      description: "Complete your first focus session.",
      icon: Trophy,
      unlocked: focus.length > 0,
    },
    {
      name: "Early Bird",
      description: "Finish a session before 9 AM.",
      icon: Sun,
      unlocked: focus.some((s) => new Date(s.end).getHours() < 9),
    },
    {
      name: "Night Owl",
      description: "Finish a session after 9 PM.",
      icon: Moon,
      unlocked: focus.some((s) => new Date(s.end).getHours() >= 21),
    },
    {
      name: "Five-Day Streak",
      description: "Find your focus five days in a row.",
      icon: Flame,
      unlocked: streak(sessions) >= 5,
    },
    {
      name: "Deep Work Champion",
      description: "Complete a session of 90 minutes.",
      icon: Mountain,
      unlocked: focus.some((s) => s.minutes >= 90),
    },
    {
      name: "100 Tasks Completed",
      description: "One hundred steps forward.",
      icon: CheckCheck,
      unlocked: rewards.filter((r) => r.id.startsWith("task:")).length >= 100,
    },
  ];
  return (
    <>
      <PageHeading
        title="Little wins. Lasting momentum."
        description="Progress deserves a moment of recognition."
      />
      {!p.gamification ? (
        <div className="panel">
          <h3>Rewards are switched off</h3>
          <p>
            You can enable them in Settings whenever you like. Your focus
            history still counts.
          </p>
        </div>
      ) : (
        <>
          <div className="panel reward-hero">
            <Ring progress={(total % 500) / 500}>
              <small>YOUR LEVEL</small>
              <strong>{Math.floor(total / 500) + 1}</strong>
            </Ring>
            <div>
              <h2>Keep becoming.</h2>
              <p>
                {total} XP earned · {500 - (total % 500)} XP to your next level
              </p>
              <p>
                2 XP per full focus minute (completed sessions), 20 XP per task.
                Each source is awarded once.
              </p>
              <div className="row wrap">
                <span className="badge">
                  Best session:{" "}
                  {duration(Math.max(0, ...focus.map((s) => s.minutes)))}
                </span>
                <span className="badge">
                  {tasks.filter((t) => t.status === "completed").length} tasks
                  done
                </span>
              </div>
            </div>
          </div>
          <div className="three-grid">
            {badges.map(
              ({ name, description, icon: Icon, unlocked: current }) => {
                const unlocked =
                  current ||
                  rewards.some((r) => r.id === "achievement:" + name);
                return (
                  <div
                    className={
                      "panel achievement " + (unlocked ? "unlocked" : "")
                    }
                    key={name}
                  >
                    <div className="medal">
                      {unlocked ? <Icon size={32} /> : <Lock size={26} />}
                    </div>
                    <h3>{name}</h3>
                    <p>{description}</p>
                    <small>{unlocked ? "Unlocked" : "A milestone ahead"}</small>
                  </div>
                );
              },
            )}
          </div>
        </>
      )}
    </>
  );
}
