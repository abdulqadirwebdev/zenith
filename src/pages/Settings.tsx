import { useState } from "react";
import { Download, Upload, ShieldCheck } from "lucide-react";
import { usePrefs, useTasks, useSessions } from "../hooks/useData";
import { db, defaults, seedDemo } from "../db";
import type { Preferences } from "../types";
import { act, toast } from "../stores/ui";
import {
  exportBackup,
  validateBackup,
  importBackup,
  type Backup,
} from "../services/backup";
import { download, csv } from "../utils/analytics";
import { PageHeading, Modal } from "../components/ui";
export default function Settings() {
  const p = usePrefs(),
    tasks = useTasks(),
    sessions = useSessions();
  const [backup, setBackup] = useState<Backup>();
  const update = (v: Partial<Preferences>) =>
    act(db.preferences.update("main", v));
  const toggle = (key: keyof Preferences, label: string) => (
    <label className="setting-toggle" key={key}>
      <span>{label}</span>
      <input
        type="checkbox"
        checked={Boolean(p[key])}
        onChange={(e) => update({ [key]: e.target.checked })}
      />
    </label>
  );
  const number = (
    key:
      | "focus"
      | "shortBreak"
      | "longBreak"
      | "longAfter"
      | "target"
      | "minBlock"
      | "maxBlock"
      | "breakEvery",
    label: string,
  ) => (
    <label key={key}>
      {label}
      <input
        type="number"
        min="1"
        max="1440"
        value={p[key]}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (v >= 1 && v <= 1440) update({ [key]: v });
        }}
      />
    </label>
  );
  return (
    <>
      <PageHeading
        title="Make it your own"
        description="A workspace that works the way you do."
      />
      <div className="settings-grid">
        <section className="panel">
          <h3>Profile</h3>
          <label>
            Display name
            <input
              value={p.name}
              maxLength={60}
              onChange={(e) => update({ name: e.target.value })}
            />
          </label>
          <label>
            Your role
            <select
              value={p.role}
              onChange={(e) => update({ role: e.target.value })}
            >
              <option>student</option>
              <option>professional</option>
              <option>both</option>
            </select>
          </label>
          {number("target", "Daily focus target (minutes)")}
        </section>
        <section className="panel">
          <h3>Appearance & accessibility</h3>
          <label>
            Theme
            <select
              aria-label="Theme"
              value={p.theme}
              onChange={(e) =>
                update({ theme: e.target.value as Preferences["theme"] })
              }
            >
              <option value="dark">Midnight dark</option>
              <option value="light">Daylight</option>
              <option value="system">System</option>
            </select>
          </label>
          <label>
            Accent palette
            <select
              value={p.accent}
              onChange={(e) => update({ accent: e.target.value })}
            >
              {[
                ["#8B5CF6", "Violet Nebula"],
                ["#38BDF8", "Ocean Blue"],
                ["#34D399", "Emerald Forest"],
                ["#FBBF24", "Sunset Amber"],
              ].map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {toggle("reducedMotion", "Reduce motion")}
          {toggle("compact", "Compact density")}
          {toggle("orbs", "Subtle background glow")}
          {toggle("clock24", "24-hour clock")}
          <label>
            First day of week
            <select
              value={p.weekStart}
              onChange={(e) =>
                update({ weekStart: Number(e.target.value) as 0 | 1 })
              }
            >
              <option value="1">Monday</option>
              <option value="0">Sunday</option>
            </select>
          </label>
        </section>
        <section className="panel">
          <h3>Timer preferences</h3>
          <div className="form-grid">
            {number("focus", "Focus minutes")}
            {number("shortBreak", "Short break minutes")}
            {number("longBreak", "Long break minutes")}
            {number("longAfter", "Long break after sessions")}
          </div>
          {toggle("autoBreak", "Auto-start breaks")}
          {toggle("autoFocus", "Auto-start focus")}
          {toggle("keepAwake", "Keep screen awake when supported")}
          {toggle("completionSound", "Completion sound")}
          {toggle("tick", "Soft timer tick")}
          {toggle("pauseAudio", "Pause ambience when timer finishes")}
          <label>
            Completion sound volume
            <input
              type="range"
              min="0"
              max="1"
              step=".01"
              value={p.volume}
              onChange={(e) => update({ volume: Number(e.target.value) })}
            />
          </label>
        </section>
        <section className="panel">
          <h3>Notifications & motivation</h3>
          {toggle("gamification", "Enable XP and achievements")}
          {toggle("deadlineNotifications", "Deadline reminders")}
          {toggle("sessionNotifications", "Session completion notifications")}
          {toggle("goalNotifications", "Goal reminders")}
          <button
            onClick={() => {
              if (!("Notification" in window)) {
                toast("Browser notifications are unavailable.");
                return;
              }
              act(
                Notification.requestPermission().then((permission) => {
                  update({ notifications: permission === "granted" });
                  toast(
                    permission === "granted"
                      ? "Browser notifications enabled"
                      : "Browser permission was not granted. In-app notices remain available.",
                  );
                }),
              );
            }}
          >
            Enable browser notifications
          </button>
          <p className="small muted">
            Permission:{" "}
            {"Notification" in window ? Notification.permission : "unavailable"}
            . Browser reminders require this app to be open and able to run.
          </p>
        </section>
        <section className="panel">
          <h3>Scheduling rules</h3>
          <div className="form-grid">
            {number("minBlock", "Minimum block minutes")}
            {number("maxBlock", "Maximum block minutes")}
            {number("breakEvery", "Break after blocks")}
          </div>
          <p className="small muted">
            Tasks are ordered by priority, deadline, and manual order. Blocks
            use the smaller of your focus duration and maximum length. Breaks
            use the short break duration.
          </p>
          {p.minBlock > Math.min(p.focus, p.maxBlock) && (
            <p className="warning">
              Minimum block exceeds the preferred focus length. Adjust these
              values before planning.
            </p>
          )}
          <h4>Working hours</h4>
          {p.workHours.map((h, i) => (
            <div className="hours-row" key={i}>
              <label className="check">
                <input
                  aria-label={
                    "Enable " +
                    [
                      "Sunday",
                      "Monday",
                      "Tuesday",
                      "Wednesday",
                      "Thursday",
                      "Friday",
                      "Saturday",
                    ][i]
                  }
                  type="checkbox"
                  checked={h.enabled}
                  onChange={(e) =>
                    update({
                      workHours: p.workHours.map((v, n) =>
                        n === i ? { ...v, enabled: e.target.checked } : v,
                      ),
                    })
                  }
                />
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i]}
              </label>
              <input
                aria-label={"Start " + i}
                type="time"
                value={h.start}
                onChange={(e) =>
                  update({
                    workHours: p.workHours.map((v, n) =>
                      n === i ? { ...v, start: e.target.value } : v,
                    ),
                  })
                }
              />
              <span>to</span>
              <input
                aria-label={"End " + i}
                type="time"
                value={h.end}
                onChange={(e) =>
                  update({
                    workHours: p.workHours.map((v, n) =>
                      n === i ? { ...v, end: e.target.value } : v,
                    ),
                  })
                }
              />
            </div>
          ))}
        </section>
        <section className="panel">
          <h3>
            <ShieldCheck size={19} />
            Data & privacy
          </h3>
          <p>
            Your data stays in IndexedDB in this browser. There is no cloud
            sync. Clearing browser data or losing this device can erase your
            workspace. Keep regular backups.
          </p>
          <div className="stack">
            <button
              onClick={() =>
                act(
                  exportBackup().then((data) =>
                    download(
                      "zenith-backup-" +
                        new Date().toISOString().slice(0, 10) +
                        ".json",
                      JSON.stringify(data, null, 2),
                    ),
                  ),
                )
              }
            >
              <Download size={16} />
              Export backup
            </button>
            <label className="button">
              <Upload size={16} />
              Import backup
              <input
                type="file"
                className="sr-only"
                accept="application/json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file)
                    act(
                      file.text().then((text) => {
                        if (file.size > 20 * 1024 * 1024)
                          throw Error("Backup exceeds 20 MB limit.");
                        setBackup(validateBackup(JSON.parse(text)));
                      }),
                    );
                }}
              />
            </label>
            <button
              onClick={() =>
                download(
                  "zenith-tasks.csv",
                  csv([
                    ["Title", "Subject", "Estimate", "Actual", "Status", "Due"],
                    ...tasks.map((t) => [
                      t.title,
                      t.subject,
                      t.estimate,
                      t.actual,
                      t.status,
                      t.due,
                    ]),
                  ]),
                  "text/csv",
                )
              }
            >
              Export tasks CSV
            </button>
            <button
              onClick={() =>
                download(
                  "zenith-sessions.csv",
                  csv([
                    ["Start", "Minutes", "Kind", "Completed"],
                    ...sessions.map((s) => [
                      new Date(s.start).toISOString(),
                      s.minutes,
                      s.kind,
                      s.completed,
                    ]),
                  ]),
                  "text/csv",
                )
              }
            >
              Export sessions CSV
            </button>
            <button
              onClick={() =>
                act(
                  seedDemo().then(() =>
                    toast(
                      tasks.length
                        ? "Demo tasks are only added to an empty workspace."
                        : "Example tasks added",
                    ),
                  ),
                )
              }
            >
              Add example tasks
            </button>
            <button
              className="danger"
              onClick={() => {
                if (
                  prompt("Type DELETE to permanently clear all local data.") ===
                  "DELETE"
                )
                  act(
                    db
                      .transaction("rw", db.tables, async () => {
                        for (const table of db.tables) await table.clear();
                        await db.preferences.put({
                          ...defaults,
                          onboarded: true,
                        });
                      })
                      .then(() => toast("Local data cleared")),
                  );
              }}
            >
              Clear all data
            </button>
          </div>
          <p className="small muted">
            JSON backups include tasks, history, notes, cards, goals,
            preferences, rewards and saved mixes. Imported audio files and an
            active timer are not included.
          </p>
        </section>
      </div>
      {backup && (
        <Modal title="Review your backup" onClose={() => setBackup(undefined)}>
          <p>Exported {backup.exportedAt}</p>
          <p>
            {backup.tasks.length} tasks · {backup.sessions.length} sessions ·{" "}
            {backup.notes.length} notes · {backup.events.length} calendar events
          </p>
          <p className="warning">
            Import replaces existing workspace records and stops the active
            timer. Imported audio files stay in your library.
          </p>
          <footer className="modal-actions">
            <button onClick={() => setBackup(undefined)}>Cancel</button>
            <button
              className="primary"
              onClick={() =>
                act(
                  importBackup(backup).then(() => {
                    setBackup(undefined);
                    toast("Backup restored");
                  }),
                )
              }
            >
              Replace & import
            </button>
          </footer>
        </Modal>
      )}
    </>
  );
}
