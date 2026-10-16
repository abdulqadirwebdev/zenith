import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { elapsedSeconds, finishTimer, startTimer } from "../services/timer";
import { usePrefs } from "./useData";
import { act, toast } from "../stores/ui";
import { chime, stopAudio } from "../services/audio";
import { pauseLibrary } from "../services/library";
export function useTimer() {
  const timer = useLiveQuery(() => db.timers.toCollection().first());
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  const elapsed = timer ? elapsedSeconds(timer, now) : 0;
  return {
    timer,
    elapsed,
    remaining: timer ? Math.max(0, timer.duration - elapsed) : 0,
  };
}
export function TimerEngine() {
  const { timer, elapsed } = useTimer();
  const p = usePrefs();
  const wholeSecond = Math.floor(elapsed);
  useEffect(() => {
    if (p.tick && timer?.running && wholeSecond > 0) chime(p.volume * 0.08);
  }, [p.tick, p.volume, timer?.running, wholeSecond]);
  useEffect(() => {
    if (
      !timer ||
      !timer.running ||
      timer.mode === "Stopwatch" ||
      elapsed < timer.duration
    )
      return;
    act(
      finishTimer(timer.id).then(async (finished) => {
        if (!finished) return;
        toast(
          timer.kind === "focus"
            ? "Beautiful work. Your session is complete."
            : "Break complete. Ready when you are.",
        );
        if (p.completionSound) chime(p.volume);
        if (p.pauseAudio) {
          stopAudio();
          pauseLibrary();
        }
        if (
          p.notifications &&
          p.sessionNotifications &&
          "Notification" in window &&
          Notification.permission === "granted"
        )
          new Notification("ZENITH — session complete", {
            body: "Your time has been recorded.",
          });
        if (timer.kind === "focus" && p.autoBreak) {
          const count = await db.sessions
            .filter((s) => s.kind === "focus" && s.completed)
            .count();
          await startTimer(
            count % p.longAfter === 0 ? p.longBreak : p.shortBreak,
            undefined,
            "break",
          );
        } else if (timer.kind === "break" && p.autoFocus)
          await startTimer(p.focus);
      }),
    );
  }, [timer, elapsed, p]);
  useEffect(() => {
    if (!p.keepAwake || !timer?.running || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | undefined;
    let disposed = false;
    const request = () => {
      if (document.visibilityState === "visible")
        void navigator.wakeLock
          .request("screen")
          .then((l) => {
            if (disposed) void l.release();
            else lock = l;
          })
          .catch(() => {});
    };
    request();
    document.addEventListener("visibilitychange", request);
    return () => {
      disposed = true;
      void lock?.release();
      document.removeEventListener("visibilitychange", request);
    };
  }, [p.keepAwake, timer?.running]);
  return null;
}
export const clockTime = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
