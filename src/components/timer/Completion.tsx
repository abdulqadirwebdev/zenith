import { useLiveQuery } from "dexie-react-hooks";
import { Check, ArrowRight, Coffee } from "lucide-react";
import { db } from "../../db";
import { usePrefs } from "../../hooks/useData";
import { act, useUI } from "../../stores/ui";
import { startTimer } from "../../services/timer";
import { Modal } from "../ui";
export default function Completion() {
  const id = useUI((s) => s.celebration);
  const prefs = usePrefs();
  const session = useLiveQuery(
    () => (id ? db.sessions.get(id) : undefined),
    [id],
  );
  const timer = useLiveQuery(() => db.timers.toCollection().first());
  if (!id || !session) return null;
  const close = () => useUI.setState({ celebration: null });
  return (
    <Modal
      title={
        session.kind === "focus" ? "A moment well spent." : "Welcome back."
      }
      onClose={close}
    >
      <div className="completion">
        <div className="completion-check">
          <Check size={38} />
        </div>
        {prefs.gamification && (
          <div className="confetti" aria-hidden="true">
            {Array.from({ length: 14 }, (_, i) => (
              <i
                key={i}
                style={{
                  left: `${i * 7}%`,
                  animationDelay: `${i * 0.04}s`,
                  background: i % 2 ? "var(--accent)" : "#38BDF8",
                }}
              />
            ))}
          </div>
        )}
        <h2>{Math.round(session.minutes)} minutes, just for you.</h2>
        <p>
          Your time has been saved{session.taskId ? " to your linked task" : ""}
          . Small, consistent steps add up.
        </p>
        <div className="row wrap center">
          {!timer && session.kind === "focus" && (
            <button
              className="primary"
              onClick={() =>
                act(
                  startTimer(prefs.shortBreak, undefined, "break").then(close),
                )
              }
            >
              <Coffee size={17} />
              Take a break
            </button>
          )}
          <button
            onClick={() => {
              close();
              useUI.getState().setPage("My Tasks");
            }}
          >
            Choose next task
            <ArrowRight size={16} />
          </button>
          <button className="ghost" onClick={close}>
            Continue
          </button>
        </div>
      </div>
    </Modal>
  );
}
