import { useState, useEffect, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import {
  Orbit,
  LayoutDashboard,
  ListTodo,
  Timer,
  CalendarDays,
  Music2,
  Coffee,
  BookOpen,
  ChartNoAxesColumn,
  Trophy,
  Settings,
  Search,
  Bell,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  Play,
  Pause,
  Headphones,
  Command,
  Menu,
} from "lucide-react";
import { useUI, pages, act } from "../../stores/ui";
import { usePrefs, useTasks } from "../../hooks/useData";
import { useTimer, clockTime } from "../../hooks/useTimer";
import { db } from "../../db";
import { toggleTimer, startTimer } from "../../services/timer";
import { useAudio, playAudio, stopAudio } from "../../services/audio";
import { Modal, Empty } from "../ui";
const icons = [
  LayoutDashboard,
  ListTodo,
  Timer,
  CalendarDays,
  Music2,
  Coffee,
  BookOpen,
  ChartNoAxesColumn,
  Trophy,
  Settings,
];
export default function Shell({ children }: { children: ReactNode }) {
  const ui = useUI(),
    p = usePrefs(),
    tasks = useTasks();
  const { timer, remaining, elapsed } = useTimer();
  const audio = useAudio();
  const [now, setNow] = useState(new Date());
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [query, setQuery] = useState("");
  const notices =
    useLiveQuery(() =>
      db.notices.orderBy("created").reverse().limit(50).toArray(),
    ) ?? [];
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest(
        "input,textarea,select,button,[contenteditable],[role=dialog]",
      );
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        ui.set({ command: !useUI.getState().command });
      }
      if (!typing && e.key === "?") setShortcuts(true);
      if (!typing && e.code === "Space" && timer) {
        e.preventDefault();
        act(toggleTimer());
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [ui, timer]);
  const navigate = (page: (typeof pages)[number]) => {
    ui.setPage(page);
    setMobile(false);
    ui.set({ command: false });
  };
  const commands = [
    ...pages.map((page) => ({
      name: "Open " + page,
      action: () => navigate(page),
    })),
    {
      name: "Add task",
      action: () => ui.set({ taskEditor: "new", command: false }),
    },
    {
      name: "Start focus",
      action: () => {
        act(startTimer(p.focus));
        navigate("Focus Studio");
      },
    },
    { name: "Pause / resume timer", action: () => act(toggleTimer()) },
    {
      name: "Play / pause music",
      action: () => (audio.playing ? stopAudio() : act(playAudio())),
    },
    {
      name: "Switch theme",
      action: () =>
        act(
          db.preferences.update("main", {
            theme: p.theme === "dark" ? "light" : "dark",
          }),
        ),
    },
    ...tasks.map((t) => ({
      name: t.title,
      action: () => ui.set({ taskEditor: t.id, command: false }),
    })),
  ].filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
  return (
    <div
      className={
        "app-shell " +
        (ui.collapsed ? "collapsed " : "") +
        (mobile ? "mobile-open" : "")
      }
    >
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate("Dashboard")}>
          <Orbit size={29} />
          <span>ZENITH</span>
        </button>
        <div className="nav-label">YOUR WORKSPACE</div>
        <nav>
          {pages.map((page, i) => {
            const Icon = icons[i];
            return (
              <button
                title={ui.collapsed ? page : undefined}
                key={page}
                className={ui.page === page ? "active" : ""}
                onClick={() => navigate(page)}
              >
                <Icon size={19} />
                <span>{page}</span>
                {page === "My Tasks" && (
                  <small>
                    {
                      tasks.filter(
                        (t) => !t.archived && t.status !== "completed",
                      ).length
                    }
                  </small>
                )}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <button className="shortcut-help" onClick={() => setShortcuts(true)}>
            <Command size={16} />
            <span>Keyboard shortcuts</span>
            <kbd>?</kbd>
          </button>
          <button className="profile" onClick={() => navigate("Settings")}>
            <span className="avatar">{p.name.charAt(0).toUpperCase()}</span>
            <span>
              <strong>{p.name}</strong>
              <small>{p.role} · personal space</small>
            </span>
          </button>
          <button
            className="collapse-button"
            aria-label="Toggle sidebar"
            onClick={() => ui.set({ collapsed: !ui.collapsed })}
          >
            {ui.collapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
            <span>Collapse sidebar</span>
          </button>
        </div>
      </aside>
      {mobile && (
        <button
          className="drawer-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="workspace">
        <header className="topbar">
          <button
            className="icon mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMobile(!mobile)}
          >
            <Menu />
          </button>
          <button
            className="global-search"
            onClick={() => ui.set({ command: true })}
          >
            <Search size={17} />
            <span>Search your universe…</span>
            <kbd>⌘ K</kbd>
          </button>
          <div className="topbar-right">
            <span className="live-clock">
              {format(now, p.clock24 ? "HH:mm:ss" : "h:mm a")}
              <small>{format(now, "EEE, MMM d")}</small>
            </span>
            <button
              className="icon"
              aria-label="Toggle theme"
              onClick={() =>
                act(
                  db.preferences.update("main", {
                    theme: p.theme === "light" ? "dark" : "light",
                  }),
                )
              }
            >
              {p.theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
            </button>
            <button
              className="icon notification-button"
              aria-label="Notifications"
              onClick={() => setNoticesOpen(true)}
            >
              <Bell size={19} />
              {notices.some((n) => !n.read) && <i />}
            </button>
            <button
              className="icon quick-plus"
              aria-label="Quick add task"
              onClick={() => ui.set({ taskEditor: "new" })}
            >
              <Plus size={20} />
            </button>
          </div>
        </header>
        <main id="main-content" key={ui.page}>
          {children}
        </main>
        <footer className="mini-bar">
          <div className="mini-session">
            <span className="mini-orbit">
              <Timer size={20} />
            </span>
            <button className="ghost" onClick={() => navigate("Focus Studio")}>
              <strong>
                {timer
                  ? (tasks.find((t) => t.id === timer.taskId)?.title ??
                    "Focus session")
                  : "A little focus goes a long way"}
              </strong>
              <small>
                {timer ? timer.mode : "Your next session is waiting"}
              </small>
            </button>
          </div>
          <strong className="mini-clock">
            {clockTime(
              timer
                ? timer.mode === "Stopwatch"
                  ? elapsed
                  : remaining
                : p.focus * 60,
            )}
          </strong>
          <button
            className="round-play"
            aria-label={
              timer?.running ? "Pause timer" : "Start or resume timer"
            }
            onClick={() => act(timer ? toggleTimer() : startTimer(p.focus))}
          >
            {timer?.running ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <div className="mini-audio">
            <Headphones size={17} />
            <span>
              {audio.playing
                ? "Your soundscape is playing"
                : "Find your frequency"}
            </span>
            <button
              className="icon"
              aria-label="Toggle ambient audio"
              onClick={() => (audio.playing ? stopAudio() : act(playAudio()))}
            >
              {audio.playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
          </div>
        </footer>
      </div>
      <nav className="bottom-nav">
        {[0, 1, 2, 3, 4].map((i) => {
          const Icon = icons[i];
          return (
            <button
              key={i}
              className={ui.page === pages[i] ? "active" : ""}
              onClick={() => navigate(pages[i])}
            >
              <Icon size={20} />
              <span>{["Home", "Tasks", "Focus", "Plan", "Sounds"][i]}</span>
            </button>
          );
        })}
        <button onClick={() => setMobile(true)}>
          <Menu size={20} />
          <span>More</span>
        </button>
      </nav>
      {ui.command && (
        <Modal
          title="Find your next move"
          onClose={() => ui.set({ command: false })}
        >
          <input
            autoFocus
            aria-label="Search commands"
            placeholder="Search commands, pages, and tasks…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="command-list">
            {commands.slice(0, 20).map((c, i) => (
              <button
                key={c.name + i}
                onClick={() => {
                  c.action();
                  ui.set({ command: false });
                }}
              >
                <Search size={16} />
                {c.name}
              </button>
            ))}
          </div>
        </Modal>
      )}
      {shortcuts && (
        <Modal title="Keyboard shortcuts" onClose={() => setShortcuts(false)}>
          <div className="shortcut-row">
            <span>Command palette</span>
            <kbd>Ctrl / ⌘ + K</kbd>
          </div>
          <div className="shortcut-row">
            <span>Pause / resume timer</span>
            <kbd>Space</kbd>
          </div>
          <div className="shortcut-row">
            <span>Show shortcuts</span>
            <kbd>?</kbd>
          </div>
          <div className="shortcut-row">
            <span>Close dialog</span>
            <kbd>Esc</kbd>
          </div>
          <p>
            Drag handles also support keyboard sorting: Space to pick up, arrows
            to move, Space to drop.
          </p>
        </Modal>
      )}
      {noticesOpen && (
        <Modal title="Your notifications" onClose={() => setNoticesOpen(false)}>
          <button
            onClick={() =>
              act(db.notices.toCollection().modify({ read: true }))
            }
          >
            Mark all read
          </button>
          {notices.map((n) => (
            <div className={"notice " + (!n.read ? "unread" : "")} key={n.id}>
              <strong>{n.title}</strong>
              <p>{n.body}</p>
              <small>{format(n.created, "MMM d, h:mm a")}</small>
            </div>
          ))}
          {!notices.length && (
            <Empty
              title="All quiet here"
              body="Session completions and reminders will appear here."
            />
          )}
        </Modal>
      )}
    </div>
  );
}
