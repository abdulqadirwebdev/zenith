import { useState } from "react";
import {
  format,
  subDays,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  startOfWeek,
  startOfMonth,
} from "date-fns";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import { Download } from "lucide-react";
import { useSessions, useTasks } from "../hooks/useData";
import { duration, csv, download, streak } from "../utils/analytics";
import { PageHeading, Tabs, Empty } from "../components/ui";
export default function Analytics() {
  const sessions = useSessions(),
    tasks = useTasks();
  const [range, setRange] = useState("7 days");
  const [aggregation, setAggregation] = useState("Daily");
  const [from, setFrom] = useState(
    format(subDays(new Date(), 7), "yyyy-MM-dd"),
  );
  const [to, setTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const begin =
    range === "Custom"
      ? +startOfDay(new Date(from))
      : +startOfDay(
          subDays(
            new Date(),
            range === "Today" ? 0 : Number(range.split(" ")[0]) - 1,
          ),
        );
  const end = range === "Custom" ? +endOfDay(new Date(to)) : Date.now();
  const selected = sessions.filter(
    (s) => s.kind === "focus" && s.end >= begin && s.end <= end,
  );
  const total = selected.reduce((n, s) => n + s.minutes, 0);
  const days =
    Number.isFinite(begin) && Number.isFinite(end) && begin <= end
      ? eachDayOfInterval({
          start: begin,
          end: Math.min(end, begin + 366 * 86400000),
        }).map((day) => ({
          date: format(day, "MMM d"),
          timestamp: +day,
          minutes: Math.round(
            selected
              .filter(
                (s) =>
                  format(s.end, "yyyy-MM-dd") === format(day, "yyyy-MM-dd"),
              )
              .reduce((n, s) => n + s.minutes, 0),
          ),
        }))
      : [];
  const grouped = new Map<string, number>();
  for (const day of days) {
    const key =
      aggregation === "Weekly"
        ? format(startOfWeek(day.timestamp, { weekStartsOn: 1 }), "MMM d")
        : aggregation === "Monthly"
          ? format(startOfMonth(day.timestamp), "MMM yyyy")
          : day.date;
    grouped.set(key, (grouped.get(key) ?? 0) + day.minutes);
  }
  const trend = [...grouped].map(([date, minutes]) => ({
    date,
    minutes:
      aggregation === "Weekly"
        ? Math.round((minutes / 60) * 100) / 100
        : minutes,
  }));
  const subjects = [...new Set(selected.map((s) => s.subject))].map(
    (subject) => ({
      subject,
      minutes: Math.round(
        selected
          .filter((s) => s.subject === subject)
          .reduce((n, s) => n + s.minutes, 0),
      ),
    }),
  );
  const estimates = tasks
    .filter((t) => t.actual > 0)
    .slice(0, 12)
    .map((t) => ({
      name: t.title.slice(0, 14),
      Estimated: t.estimate,
      Actual: Math.round(t.actual),
    }));
  const completed = tasks.filter(
    (t) => t.completed && t.completed >= begin && t.completed <= end,
  ).length;
  const completionRate = tasks.length
    ? Math.round(
        (completed /
          Math.max(1, tasks.filter((t) => t.created <= end).length)) *
          100,
      )
    : 0;
  const tooltip = {
    contentStyle: {
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      color: "var(--text)",
    },
  };
  return (
    <>
      <PageHeading
        title="Your momentum"
        description="A clearer picture of where your time goes."
      >
        <button
          onClick={() =>
            download(
              "zenith-sessions.csv",
              csv([
                [
                  "ID",
                  "Task",
                  "Subject",
                  "Start",
                  "End",
                  "Minutes",
                  "Completed",
                ],
                ...selected.map((s) => [
                  s.id,
                  s.taskId,
                  s.subject,
                  new Date(s.start).toISOString(),
                  new Date(s.end).toISOString(),
                  s.minutes,
                  s.completed,
                ]),
              ]),
              "text/csv",
            )
          }
        >
          <Download size={16} />
          Export CSV
        </button>
      </PageHeading>
      <div className="toolbar">
        <Tabs
          values={["Today", "7 days", "30 days", "90 days", "Custom"]}
          value={range}
          onChange={setRange}
        />
        {range === "Custom" && (
          <>
            <label>
              From
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </>
        )}
      </div>
      <div className="four-grid">
        {[
          ["Total focus", duration(total)],
          ["Completed tasks", completed],
          ["Current streak", streak(sessions) + " days"],
          [
            "Session completion",
            selected.length
              ? Math.round(
                  (selected.filter((s) => s.completed).length /
                    selected.length) *
                    100,
                ) + "%"
              : "—",
          ],
        ].map(([label, value]) => (
          <div className="panel stat" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      {!selected.length ? (
        <Empty
          title="Your progress will live here"
          body="Complete your first focus session to see meaningful insights. No made-up numbers, just your work."
        />
      ) : (
        <div className="two-grid">
          <div className="panel">
            <h3>Task completion rate</h3>
            <p>
              {completionRate}% of existing tasks completed in this date range.
            </p>
            <progress value={completionRate} max={100} />
            <h3>Streak history</h3>
            <div className="streak-strip">
              {days.map((day) => (
                <span
                  key={day.timestamp}
                  className={day.minutes >= 1 ? "active-day" : ""}
                  title={`${day.date}: ${day.minutes} focus minutes`}
                />
              ))}
            </div>
            <small>
              Each square is one day. Violet marks at least one minute of focus.
            </small>
          </div>
          <div className="panel">
            <div className="section-heading">
              <h3>
                {aggregation === "Daily"
                  ? "Daily focus minutes"
                  : aggregation === "Weekly"
                    ? "Weekly focus hours"
                    : "Monthly focus trend"}
              </h3>
              <Tabs
                values={["Daily", "Weekly", "Monthly"]}
                value={aggregation}
                onChange={setAggregation}
              />
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trend}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                />
                <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} />
                <Tooltip {...tooltip} />
                <Area
                  dataKey="minutes"
                  stroke="var(--accent)"
                  fill="var(--accent)"
                  fillOpacity={0.15}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="panel">
            <h3>Focus by subject</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={subjects}>
                <XAxis
                  dataKey="subject"
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                />
                <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} />
                <Tooltip {...tooltip} />
                <Bar
                  dataKey="minutes"
                  fill="var(--accent)"
                  radius={[5, 5, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="panel">
            <h3>Estimated vs. actual minutes</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={estimates}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--muted)", fontSize: 10 }}
                />
                <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} />
                <Tooltip {...tooltip} />
                <Bar dataKey="Estimated" fill="#38BDF8" />
                <Bar dataKey="Actual" fill="var(--accent)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="panel">
            <h3>Productive hours</h3>
            <p className="small muted">
              Minutes grouped by session start, in local time.
            </p>
            <div className="heatmap">
              {Array.from({ length: 24 }, (_, hour) => {
                const minutes = selected
                  .filter((s) => new Date(s.start).getHours() === hour)
                  .reduce((n, s) => n + s.minutes, 0);
                return (
                  <div
                    key={hour}
                    title={`${hour}:00 — ${Math.round(minutes)} minutes`}
                    style={{
                      background: minutes
                        ? `color-mix(in srgb, var(--accent) ${Math.min(90, 20 + minutes)}%, var(--surface))`
                        : undefined,
                    }}
                  >
                    <small>{hour.toString().padStart(2, "0")}</small>
                  </div>
                );
              })}
            </div>
            <h3>Workload distribution</h3>
            {[...new Set(tasks.map((t) => t.subject))].map((subject) => (
              <div className="row between" key={subject}>
                <span>{subject}</span>
                <strong>
                  {duration(
                    tasks
                      .filter(
                        (t) =>
                          t.subject === subject && t.status !== "completed",
                      )
                      .reduce(
                        (n, t) => n + Math.max(0, t.estimate - t.actual),
                        0,
                      ),
                  )}{" "}
                  remaining
                </strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
