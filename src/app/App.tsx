import {
  lazy,
  Suspense,
  useEffect,
  useState,
  Component,
  type ReactNode,
} from "react";
import { MotionConfig, AnimatePresence, motion } from "motion/react";
import { initialize } from "../db";
import { usePrefs, useTasks } from "../hooks/useData";
import { useUI, act, report } from "../stores/ui";
import { TimerEngine } from "../hooks/useTimer";
import { checkReminders } from "../services/notifications";
import Shell from "../components/layout/Shell";
import Onboarding from "../components/settings/Onboarding";
import TaskEditor from "../components/tasks/TaskEditor";
import Dashboard from "../pages/Dashboard";
import Completion from "../components/timer/Completion";
const Tasks = lazy(() => import("../pages/Tasks")),
  Focus = lazy(() => import("../pages/Focus")),
  Schedule = lazy(() => import("../pages/Schedule")),
  Music = lazy(() => import("../pages/Music")),
  Breaks = lazy(() => import("../pages/Breaks")),
  Study = lazy(() => import("../pages/Study")),
  Analytics = lazy(() => import("../pages/Analytics")),
  Achievements = lazy(() => import("../pages/Achievements")),
  Settings = lazy(() => import("../pages/Settings"));
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: string }
> {
  state = { error: "" };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  render() {
    return this.state.error ? (
      <div className="fatal">
        <h1>Let’s get you back on track.</h1>
        <p>{this.state.error}</p>
        <button onClick={() => location.reload()}>Reload workspace</button>
        <p>Your local data has not been cleared.</p>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  const p = usePrefs(),
    tasks = useTasks(),
    ui = useUI();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [ui.page]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    void initialize()
      .then(() => setReady(true))
      .catch((e) => setError(String(e)));
    const handler = (e: PromiseRejectionEvent) => {
      report(e.reason);
      e.preventDefault();
    };
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: light)");
    const update = () => {
      document.documentElement.dataset.theme =
        p.theme === "system" ? (media.matches ? "light" : "dark") : p.theme;
      document.documentElement.style.setProperty("--accent", p.accent);
      document.documentElement.dataset.motion = p.reducedMotion
        ? "reduced"
        : "full";
      document.documentElement.dataset.density = p.compact
        ? "compact"
        : "comfortable";
      document.documentElement.dataset.orbs = String(p.orbs);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [p]);
  useEffect(() => {
    if (!ready) return;
    act(checkReminders());
    const id = setInterval(() => act(checkReminders()), 60000);
    return () => clearInterval(id);
  }, [ready]);
  if (error)
    return (
      <div className="fatal">
        <h1>Browser storage is unavailable</h1>
        <p>{error}</p>
        <p>Enable IndexedDB and reload to use ZENITH.</p>
      </div>
    );
  if (!ready)
    return (
      <div className="skeleton">
        <i />
        <i />
        <i />
      </div>
    );
  const page =
    ui.page === "Dashboard" ? (
      <Dashboard />
    ) : ui.page === "My Tasks" ? (
      <Tasks />
    ) : ui.page === "Focus Studio" ? (
      <Focus />
    ) : ui.page === "Schedule" ? (
      <Schedule />
    ) : ui.page === "Music & Ambience" ? (
      <Music />
    ) : ui.page === "Break Studio" ? (
      <Breaks />
    ) : ui.page === "Study Space" ? (
      <Study />
    ) : ui.page === "Analytics" ? (
      <Analytics />
    ) : ui.page === "Achievements" ? (
      <Achievements />
    ) : (
      <Settings />
    );
  return (
    <MotionConfig reducedMotion={p.reducedMotion ? "always" : "user"}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <TimerEngine />
      <Completion />
      {p.onboarded ? (
        <Shell>
          <Suspense
            fallback={
              <div className="skeleton">
                <i />
                <i />
                <i />
              </div>
            }
          >
            {page}
          </Suspense>
        </Shell>
      ) : (
        <Onboarding />
      )}
      {ui.taskEditor && (
        <TaskEditor
          task={tasks.find((t) => t.id === ui.taskEditor)}
          onClose={() => ui.set({ taskEditor: null })}
        />
      )}
      <AnimatePresence>
        {ui.toast && (
          <motion.div
            className="toast"
            role="status"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {ui.toast}
            <button
              aria-label="Dismiss notification"
              onClick={() => ui.set({ toast: "" })}
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
