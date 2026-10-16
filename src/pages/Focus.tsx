import { useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Maximize,
  Check,
  Plus,
  SkipForward,
} from "lucide-react";
import { useTimer, clockTime } from "../hooks/useTimer";
import { usePrefs, useTasks } from "../hooks/useData";
import { db } from "../db";
import { startTimer, toggleTimer, finishTimer } from "../services/timer";
import { act, toast } from "../stores/ui";
import { PageHeading, Ring, Tabs } from "../components/ui";
export default function Focus() {
  const p = usePrefs();
  const tasks = useTasks();
  const { timer, remaining, elapsed } = useTimer();
  const [mode, setMode] = useState("Pomodoro");
  const [minutes, setMinutes] = useState(p.focus);
  const [taskId, setTask] = useState("");
  const [deadline, setDeadline] = useState("");
  const [immersive, setImmersive] = useState(false);
  const length =
    mode === "Pomodoro"
      ? 25
      : mode === "Long Focus"
        ? 50
        : mode === "Deep Work"
          ? 90
          : mode === "Task-based"
            ? Math.max(
                1,
                (tasks.find((t) => t.id === taskId)?.estimate ?? 25) -
                  (tasks.find((t) => t.id === taskId)?.actual ?? 0),
              )
            : mode === "Deadline"
              ? Math.max(0, (+new Date(deadline) - Date.now()) / 60000)
              : minutes;
  return (
    <div className={immersive ? "immersive" : ""}>
      <PageHeading
        title="Focus Studio"
        description="One intention. One session. Your undivided attention."
      >
        <button
          onClick={() => {
            setImmersive(!immersive);
            if (!immersive)
              void document.documentElement
                .requestFullscreen?.()
                .catch(() => {});
            else if (document.fullscreenElement) void document.exitFullscreen();
          }}
        >
          <Maximize size={16} />
          {immersive ? "Exit immersive" : "Immersive mode"}
        </button>
      </PageHeading>
      <div className="focus-stage panel">
        <Tabs
          values={[
            "Pomodoro",
            "Long Focus",
            "Deep Work",
            "Custom",
            "Stopwatch",
            "Task-based",
            "Deadline",
          ]}
          value={mode}
          onChange={setMode}
        />
        <div className={"timer-orbit " + (timer?.running ? "running" : "")}>
          <Ring size={330} progress={timer ? elapsed / timer.duration : 0}>
            <span className="eyebrow">
              {timer?.kind === "break"
                ? "RECHARGE"
                : timer?.running
                  ? "IN YOUR ELEMENT"
                  : "READY TO FOCUS"}
            </span>
            <strong className="timer-digits">
              {clockTime(
                timer
                  ? timer.mode === "Stopwatch"
                    ? elapsed
                    : remaining
                  : length * 60,
              )}
            </strong>
            <span className="muted">
              {timer?.mode ?? mode} ·{" "}
              {timer?.running
                ? "Stay with this moment"
                : "Make this time yours"}
            </span>
          </Ring>
        </div>
        <label className="task-select">
          Your intention
          <select
            value={timer?.taskId ?? taskId}
            onChange={(e) => {
              setTask(e.target.value);
              if (timer) {
                const next = e.target.value || undefined;
                act(
                  finishTimer(timer.id, false)
                    .then(() =>
                      startTimer(
                        Math.max(1 / 60, (timer.duration - elapsed) / 60),
                        next,
                        timer.kind,
                        timer.mode,
                      ),
                    )
                    .then(async (t) => {
                      if (!timer.running) await toggleTimer();
                      return t;
                    }),
                );
              }
            }}
          >
            <option value="">Open focus — no task</option>
            {tasks
              .filter((t) => !t.archived && t.status !== "completed")
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
          </select>
        </label>
        {!timer && (mode === "Custom" || mode === "Stopwatch") && (
          <label>
            Duration (minutes)
            <input
              type="number"
              min="1"
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
            />
          </label>
        )}
        {!timer && mode === "Deadline" && (
          <label>
            Deadline
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </label>
        )}
        <div className="timer-controls">
          <button
            className="icon large"
            aria-label="Reset timer"
            disabled={!timer}
            onClick={() => {
              if (
                timer &&
                confirm("Reset this session without saving elapsed time?")
              )
                act(db.timers.delete(timer.id));
            }}
          >
            <RotateCcw />
          </button>
          <button
            className="primary large"
            onClick={() =>
              act(
                timer
                  ? toggleTimer()
                  : startTimer(length, taskId || undefined, "focus", mode),
              )
            }
          >
            {timer?.running ? <Pause /> : <Play />}
            {timer ? (timer.running ? "Pause" : "Resume") : "Start focus"}
          </button>
          <button
            className="icon large"
            aria-label="Skip session"
            disabled={!timer}
            onClick={() => {
              if (timer)
                act(
                  finishTimer(timer.id, false).then(() =>
                    toast("Elapsed time saved; session skipped."),
                  ),
                );
            }}
          >
            <SkipForward />
          </button>
        </div>
        {timer && (
          <div className="row wrap center">
            <button
              onClick={() =>
                act(
                  db.timers.update(timer.id, {
                    duration: timer.duration + 300,
                  }),
                )
              }
            >
              <Plus size={14} />5 min
            </button>
            <button
              onClick={() =>
                act(
                  db.timers.update(timer.id, {
                    duration: timer.duration + 600,
                  }),
                )
              }
            >
              <Plus size={14} />
              10 min
            </button>
            <button
              onClick={() =>
                act(
                  finishTimer(timer.id, true).then(() =>
                    toast("Session saved. Well done."),
                  ),
                )
              }
            >
              <Check size={16} />
              Finish & save
            </button>
          </div>
        )}
        <p className="focus-quote">
          “The secret of getting ahead is getting started.”
        </p>
        <p className="muted small">
          Your timer is saved automatically, even when you switch tabs or
          refresh.
        </p>
      </div>
      <div className="three-grid">
        <div className="panel">
          <h3>Set an intention</h3>
          <p>Choose one specific thing to move forward.</p>
        </div>
        <div className="panel">
          <h3>Find your sound</h3>
          <p>Layer gentle ambience in Music & Ambience.</p>
        </div>
        <div className="panel">
          <h3>Leave space to recover</h3>
          <p>A short break is part of your progress.</p>
          <button
            onClick={() => act(startTimer(p.shortBreak, undefined, "break"))}
          >
            Start {p.shortBreak}m break
          </button>
        </div>
      </div>
    </div>
  );
}
