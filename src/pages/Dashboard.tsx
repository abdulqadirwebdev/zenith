import { useState } from "react";
import Visualizer from "../components/music/Visualizer";
import { format, isToday, subDays, isSameDay } from "date-fns";
import {
  Play,
  Plus,
  ArrowUpRight,
  Flame,
  CheckCircle2,
  Clock,
  SlidersHorizontal,
  GripVertical,
  CalendarDays,
  Headphones,
  Trophy,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  useSensors,
  useSensor,
  KeyboardSensor,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { usePrefs, useTasks, useSessions, useEvents } from "../hooks/useData";
import { db, completeTask } from "../db";
import { act, useUI } from "../stores/ui";
import { startTimer } from "../services/timer";
import { useAudio, playAudio, stopAudio } from "../services/audio";
import { duration, streak } from "../utils/analytics";
import { Ring, Empty } from "../components/ui";
function Widget({ id, children }: { id: string; children: ReactNode }) {
  const { setNodeRef, attributes, listeners, transform, transition } =
    useSortable({ id });
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={"widget widget-" + id}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      transition={{
        delay:
          [
            "focus",
            "stats",
            "tasks",
            "weekly",
            "calendar",
            "achievements",
          ].indexOf(id) * 0.04,
        duration: 0.25,
      }}
    >
      <button
        className="widget-grip icon"
        aria-label={"Move " + id + " widget"}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={15} />
      </button>
      {children}
    </motion.section>
  );
}
export default function Dashboard() {
  const p = usePrefs(),
    tasks = useTasks(),
    sessions = useSessions(),
    events = useEvents();
  const { setPage, set } = useUI();
  const audio = useAudio();
  const [custom, setCustom] = useState(false);
  const minutes = sessions
    .filter((s) => s.kind === "focus" && isToday(s.end))
    .reduce((n, s) => n + s.minutes, 0);
  const done = tasks.filter((t) => t.completed && isToday(t.completed)).length;
  const pending = tasks
    .filter((t) => !t.archived && t.status !== "completed")
    .sort(
      (a, b) =>
        ["urgent", "high", "medium", "low"].indexOf(a.priority) -
          ["urgent", "high", "medium", "low"].indexOf(b.priority) ||
        (a.due || "9999").localeCompare(b.due || "9999"),
    );
  const weekly = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(new Date(), 6 - i);
    return {
      day: format(day, "EEE"),
      value: sessions
        .filter((s) => s.kind === "focus" && isSameDay(s.end, day))
        .reduce((n, s) => n + s.minutes, 0),
    };
  });
  const max = Math.max(60, ...weekly.map((x) => x.value));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const hour = new Date().getHours();
  const widgets: Record<string, ReactNode> = {
    focus: (
      <div className="focus-summary panel">
        <div>
          <div className="eyebrow">
            <span className="status-dot" /> YOUR FOCUS, REIMAGINED
          </div>
          <h2>
            Make room for
            <br />
            deep work.
          </h2>
          <p>Small steps today. Extraordinary things tomorrow.</p>
          <button
            className="primary"
            onClick={() =>
              act(startTimer(p.focus).then(() => setPage("Focus Studio")))
            }
          >
            <Play size={17} />
            Start Focus<span>{p.focus} min</span>
          </button>
        </div>
        <Ring progress={minutes / p.target}>
          <small>DAILY GOAL</small>
          <strong>{duration(minutes)}</strong>
          <span className="muted">of {duration(p.target)}</span>
        </Ring>
      </div>
    ),
    stats: (
      <div className="stats-grid">
        {[
          [Clock, "Focus time", duration(minutes), "Time well spent"],
          [
            CheckCircle2,
            "Tasks completed",
            String(done),
            `${pending.length} still on your list`,
          ],
          [
            Flame,
            "Current streak",
            `${streak(sessions)} days`,
            "Keep showing up",
          ],
        ].map(([Icon, label, value, caption]) => {
          const I = Icon as typeof Clock;
          return (
            <div className="panel stat" key={String(label)}>
              <I size={19} />
              <span>{String(label)}</span>
              <strong>{String(value)}</strong>
              <small>{String(caption)}</small>
            </div>
          );
        })}
      </div>
    ),
    tasks: (
      <div className="panel">
        <div className="section-heading">
          <h3>
            Priority tasks <span className="count">{pending.length}</span>
          </h3>
          <button
            className="icon"
            aria-label="Open tasks"
            onClick={() => setPage("My Tasks")}
          >
            <ArrowUpRight size={18} />
          </button>
        </div>
        {pending.slice(0, 5).map((t) => (
          <div className="priority-row" key={t.id}>
            <button
              className="task-check"
              aria-label={"Complete " + t.title}
              onClick={() => act(completeTask(t.id, true))}
            />
            <button
              className="task-title"
              onClick={() => set({ taskEditor: t.id })}
            >
              <strong>{t.title}</strong>
              <small>
                {t.subject} · {t.estimate} min
              </small>
            </button>
            <span className={"badge " + t.priority}>{t.priority}</span>
          </div>
        ))}
        {!pending.length && (
          <Empty
            title="A little breathing room"
            body="Add your first task and give your next session a purpose."
          />
        )}
        <button
          className="ghost accent"
          onClick={() => set({ taskEditor: "new" })}
        >
          <Plus size={17} />
          Add a task
        </button>
      </div>
    ),
    weekly: (
      <div className="panel">
        <div className="section-heading">
          <h3>Weekly focus</h3>
          <span className="muted small">Last 7 days</span>
        </div>
        <strong className="chart-total">
          {duration(weekly.reduce((n, x) => n + x.value, 0))}
        </strong>
        <span className="muted small"> invested in yourself</span>
        <div className="bar-chart">
          {weekly.map((x) => (
            <div key={x.day}>
              <div className="bar-well">
                <div
                  title={`${x.day}: ${Math.round(x.value)} minutes`}
                  style={{ height: `${(x.value / max) * 100}%` }}
                />
              </div>
              <small>{x.day}</small>
            </div>
          ))}
        </div>
        {!sessions.length && (
          <p className="small muted">
            Your first focus session starts your story.
          </p>
        )}
      </div>
    ),
    calendar: (
      <div className="panel">
        <div className="section-heading">
          <h3>
            <CalendarDays size={17} />
            This week
          </h3>
          <button className="ghost" onClick={() => setPage("Schedule")}>
            Open planner
          </button>
        </div>
        <div className="week-strip">
          {Array.from({ length: 7 }, (_, i) => {
            const date = subDays(new Date(), new Date().getDay() - i);
            return (
              <button
                key={i}
                className={isToday(date) ? "selected" : ""}
                onClick={() => setPage("Schedule")}
              >
                <small>{format(date, "EEE")}</small>
                <strong>{format(date, "d")}</strong>
              </button>
            );
          })}
        </div>
      </div>
    ),
    achievements: (
      <div className="panel achievement-preview">
        <Trophy />
        <div>
          <h3>Every session is a step forward.</h3>
          <p>
            {p.gamification
              ? "Build your streak and discover your milestones."
              : "Your progress, without the points."}
          </p>
        </div>
        <button
          className="icon"
          aria-label="View achievements"
          onClick={() => setPage("Achievements")}
        >
          <ArrowUpRight />
        </button>
      </div>
    ),
  };
  return (
    <>
      <header className="page-heading">
        <div>
          <p className="date-label">{format(new Date(), "EEEE, MMMM d")}</p>
          <h1>
            Good {hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"},{" "}
            {p.name}
            <span className="greeting-dot">.</span>
          </h1>
          <p>
            {
              [
                "Make a little space for what matters.",
                "Your next chapter starts with one focused moment.",
                "Progress is built one thoughtful day at a time.",
              ][new Date().getDate() % 3]
            }
          </p>
        </div>
        <button onClick={() => setCustom(!custom)}>
          <SlidersHorizontal size={16} />
          Customize
        </button>
      </header>
      {custom && (
        <div className="panel toolbar">
          {p.widgets.map((id) => (
            <label className="check" key={id}>
              <input
                type="checkbox"
                checked={!p.hiddenWidgets.includes(id)}
                onChange={() =>
                  act(
                    db.preferences.update("main", {
                      hiddenWidgets: p.hiddenWidgets.includes(id)
                        ? p.hiddenWidgets.filter((x) => x !== id)
                        : [...p.hiddenWidgets, id],
                    }),
                  )
                }
              />
              {id}
            </label>
          ))}
        </div>
      )}
      <div className="dashboard-layout">
        <DndContext
          sensors={sensors}
          onDragEnd={({ active, over }) => {
            if (over)
              act(
                db.preferences.update("main", {
                  widgets: arrayMove(
                    p.widgets,
                    p.widgets.indexOf(String(active.id)),
                    p.widgets.indexOf(String(over.id)),
                  ),
                }),
              );
          }}
        >
          <SortableContext items={p.widgets}>
            <div className="dashboard-grid">
              {p.widgets
                .filter((id) => !p.hiddenWidgets.includes(id))
                .map((id) => (
                  <Widget key={id} id={id}>
                    {widgets[id]}
                  </Widget>
                ))}
            </div>
          </SortableContext>
        </DndContext>
        <aside className="right-rail">
          <div className="panel">
            <div className="section-heading">
              <h3>Today’s schedule</h3>
              <button
                className="icon"
                aria-label="Open schedule"
                onClick={() => setPage("Schedule")}
              >
                <ArrowUpRight size={18} />
              </button>
            </div>
            {events
              .filter((e) => isToday(e.start))
              .slice(0, 6)
              .map((e) => (
                <div className="timeline-item" key={e.id}>
                  <span style={{ background: e.color }} />
                  <small>
                    {format(e.start, p.clock24 ? "HH:mm" : "h:mm a")} –{" "}
                    {format(e.end, p.clock24 ? "HH:mm" : "h:mm a")}
                  </small>
                  <strong>{e.title}</strong>
                  <small>{e.kind}</small>
                </div>
              ))}
            {!events.some((e) => isToday(e.start)) && (
              <Empty
                title="A day of possibilities"
                body="Turn your task list into a realistic plan."
              >
                <button onClick={() => setPage("Schedule")}>Plan my day</button>
              </Empty>
            )}
          </div>
          <div className="panel ambient-card">
            <Headphones size={24} />
            <h3>Find your frequency</h3>
            <p>
              A softer background.
              <br />A sharper focus.
            </p>
            <Visualizer />
            <button
              className="primary"
              onClick={() => (audio.playing ? stopAudio() : act(playAudio()))}
            >
              {audio.playing ? "Pause ambience" : "Play ambience"}
            </button>
            <button
              className="ghost"
              onClick={() => setPage("Music & Ambience")}
            >
              Open sound studio <ArrowUpRight size={15} />
            </button>
          </div>
          <p className="local-note">
            Your space. Stored locally.
            <br />
            Made for a little more focus.
          </p>
        </aside>
      </div>
    </>
  );
}
