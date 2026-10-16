import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Coffee,
  Wind,
  Eye,
  Droplets,
  Footprints,
  StretchHorizontal,
} from "lucide-react";
import { PageHeading } from "../components/ui";
import { startTimer } from "../services/timer";
import { useTimer, clockTime } from "../hooks/useTimer";
import { act, toast } from "../stores/ui";
import { toggleTimer, finishTimer } from "../services/timer";
export default function Breaks() {
  const [inhale, setInhale] = useState(4),
    [hold, setHold] = useState(4),
    [exhale, setExhale] = useState(6);
  const [breathing, setBreathing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [eyes, setEyes] = useState(false);
  const { timer, remaining } = useTimer();
  useEffect(() => {
    if (!breathing) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [breathing]);
  useEffect(() => {
    if (!eyes) return;
    const id = setInterval(
      () =>
        toast(
          "Eye rest: consider looking at something about 20 feet away for 20 seconds.",
        ),
      20 * 60000,
    );
    return () => clearInterval(id);
  }, [eyes]);
  const phase = seconds % (inhale + hold + exhale);
  const label =
    phase < inhale
      ? "Breathe in"
      : phase < inhale + hold
        ? "Hold gently"
        : "Breathe out";
  return (
    <>
      <PageHeading
        title="Break Studio"
        description="Rest is part of the work. Take a moment for yourself."
      />
      <div className="two-grid">
        <div className="panel breathing-panel">
          <span className="eyebrow">COME BACK TO YOURSELF</span>
          <h2>A little room to breathe.</h2>
          <div className="breath-space">
            <motion.div
              className="breath-circle"
              animate={{
                scale: breathing ? (phase < inhale + hold ? 1.2 : 0.8) : 1,
              }}
              transition={{
                duration: breathing ? (phase < inhale ? inhale : exhale) : 0.4,
                ease: "easeInOut",
              }}
            />
            <div className="breath-copy">
              <Wind size={26} />
              <strong>{breathing ? label : "Find your rhythm"}</strong>
            </div>
          </div>
          <button
            className="primary"
            onClick={() => {
              setBreathing(!breathing);
              setSeconds(0);
            }}
          >
            {breathing ? "End breathing" : "Begin breathing"}
          </button>
          <div className="form-grid three">
            {[
              [inhale, setInhale, "Inhale"],
              [hold, setHold, "Hold"],
              [exhale, setExhale, "Exhale"],
            ].map(([value, set, label]) => (
              <label key={String(label)}>
                {String(label)} seconds
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={Number(value)}
                  onChange={(e) =>
                    (set as (v: number) => void)(
                      Math.max(1, Math.min(30, Number(e.target.value))),
                    )
                  }
                />
              </label>
            ))}
          </div>
        </div>
        <div>
          <div className="panel">
            <h3>Your next pause</h3>
            <p>Step away with intention. Return with a little more space.</p>
            <div className="two-grid">
              {[
                [2, "Micro break"],
                [5, "Short break"],
                [10, "Recharge"],
                [20, "Long break"],
              ].map(([n, name]) => (
                <button
                  className="break-option"
                  key={n}
                  onClick={() =>
                    act(startTimer(Number(n), undefined, "break", String(name)))
                  }
                >
                  <Coffee size={20} />
                  <strong>{n} min</strong>
                  <span>{name}</span>
                </button>
              ))}
            </div>
            {timer?.kind === "break" && (
              <div className="break-active">
                <strong>{clockTime(remaining)}</strong>
                <button onClick={() => act(toggleTimer())}>
                  {timer.running ? "Pause" : "Resume"}
                </button>
                <button onClick={() => act(finishTimer(timer.id))}>
                  Finish break
                </button>
              </div>
            )}
          </div>
          <div className="panel">
            <h3>A change of pace</h3>
            {[
              [
                StretchHorizontal,
                "Stretch",
                "Gently move your shoulders and stand up.",
              ],
              [Eye, "Eye rest", "Look away from your screen for a moment."],
              [Droplets, "Hydration", "Take a sip of water."],
              [
                Footprints,
                "Short walk",
                "A few steps can make a welcome change.",
              ],
            ].map(([Icon, title, body]) => {
              const I = Icon as typeof Eye;
              return (
                <button
                  className="activity"
                  key={String(title)}
                  onClick={() => {
                    toast(String(body));
                    act(startTimer(2, undefined, "break", String(title)));
                  }}
                >
                  <I size={21} />
                  <span>
                    <strong>{String(title)}</strong>
                    <small>{String(body)}</small>
                  </span>
                </button>
              );
            })}
            <label className="check">
              <input
                type="checkbox"
                checked={eyes}
                onChange={(e) => setEyes(e.target.checked)}
              />
              20-20-20 eye-rest reminder while this page is open
            </label>
          </div>
        </div>
      </div>
      <p className="muted small">
        Break activities are optional suggestions. Adjust or stop whenever you
        prefer.
      </p>
    </>
  );
}
