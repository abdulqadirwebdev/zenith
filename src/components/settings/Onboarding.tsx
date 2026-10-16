import { useState } from "react";
import { ArrowRight, Orbit, ShieldCheck } from "lucide-react";
import { db, defaults, seedDemo } from "../../db";
import { act } from "../../stores/ui";
export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [prefs, setPrefs] = useState(defaults);
  const [demo, setDemo] = useState(false);
  async function finish(skip = false) {
    if (demo && !skip) await seedDemo();
    await db.preferences.put({ ...prefs, onboarded: true });
  }
  return (
    <div className="onboarding">
      <div className="onboard-card">
        <div className="brand">
          <Orbit /> ZENITH
        </div>
        <div className="step-dots">
          {[0, 1, 2].map((i) => (
            <span key={i} className={i <= step ? "active" : ""} />
          ))}
        </div>
        {step === 0 ? (
          <>
            <span className="onboard-orbit">
              <Orbit size={64} />
            </span>
            <h1>
              Your space.
              <br />
              Your pace. Your zenith.
            </h1>
            <p>
              A little structure. A deeper focus. Make space for the things you
              want to become.
            </p>
            <div className="privacy">
              <ShieldCheck />
              <p>
                Your universe stays yours. Tasks, notes, and sessions live in
                this browser. Export backups to keep them safe.
              </p>
            </div>
          </>
        ) : step === 1 ? (
          <>
            <h1>Let’s make it yours.</h1>
            <label>
              Display name
              <input
                autoFocus
                value={prefs.name}
                onChange={(e) => setPrefs({ ...prefs, name: e.target.value })}
                maxLength={60}
              />
            </label>
            <label>
              I’m a
              <select
                value={prefs.role}
                onChange={(e) => setPrefs({ ...prefs, role: e.target.value })}
              >
                <option>student</option>
                <option>professional</option>
                <option>both</option>
              </select>
            </label>
            <div className="form-grid">
              <label>
                Study hours start
                <input
                  type="time"
                  value={prefs.workHours[1].start}
                  onChange={(e) =>
                    setPrefs({
                      ...prefs,
                      workHours: prefs.workHours.map((h) => ({
                        ...h,
                        start: e.target.value,
                      })),
                    })
                  }
                />
              </label>
              <label>
                Study hours end
                <input
                  type="time"
                  value={prefs.workHours[1].end}
                  onChange={(e) =>
                    setPrefs({
                      ...prefs,
                      workHours: prefs.workHours.map((h) => ({
                        ...h,
                        end: e.target.value,
                      })),
                    })
                  }
                />
              </label>
            </div>
          </>
        ) : (
          <>
            <h1>Find your rhythm.</h1>
            <div className="form-grid">
              {(["focus", "shortBreak", "target"] as const).map((k, i) => (
                <label key={k}>
                  {
                    ["Focus minutes", "Break minutes", "Daily target minutes"][
                      i
                    ]
                  }
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={prefs[k]}
                    onChange={(e) =>
                      setPrefs({
                        ...prefs,
                        [k]: Math.max(1, Number(e.target.value)),
                      })
                    }
                  />
                </label>
              ))}
              <label>
                Theme
                <select
                  value={prefs.theme}
                  onChange={(e) =>
                    setPrefs({
                      ...prefs,
                      theme: e.target.value as typeof prefs.theme,
                    })
                  }
                >
                  <option value="dark">Midnight dark</option>
                  <option value="light">Daylight</option>
                  <option value="system">System</option>
                </select>
              </label>
            </div>
            <label className="check">
              <input
                type="checkbox"
                checked={demo}
                onChange={(e) => setDemo(e.target.checked)}
              />
              Add three example tasks (no fabricated history)
            </label>
          </>
        )}
        <div className="row between">
          <button className="ghost" onClick={() => act(finish(true))}>
            Skip for now
          </button>
          <button
            className="primary"
            onClick={() => (step < 2 ? setStep(step + 1) : act(finish()))}
          >
            {step === 2 ? "Enter my universe" : "Continue"}
            <ArrowRight size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
