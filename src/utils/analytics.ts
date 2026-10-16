import { format, subDays, startOfDay } from "date-fns";
import type { Session } from "../types";
export function streak(sessions: Session[], now = new Date()) {
  const dates = new Set(
    sessions
      .filter((s) => s.kind === "focus" && s.minutes >= 1)
      .map((s) => format(s.end, "yyyy-MM-dd")),
  );
  let n = 0;
  let day = startOfDay(now);
  if (!dates.has(format(day, "yyyy-MM-dd"))) day = subDays(day, 1);
  while (dates.has(format(day, "yyyy-MM-dd"))) {
    n++;
    day = subDays(day, 1);
  }
  return n;
}
export const duration = (minutes: number) =>
  minutes >= 60
    ? `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`
    : `${Math.round(minutes)}m`;
export function download(
  name: string,
  content: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function csv(rows: unknown[][]) {
  return rows
    .map((row) =>
      row
        .map((v) => {
          let s = String(v ?? "");
          if (/^[=+@-]/.test(s)) s = "'" + s;
          return '"' + s.replaceAll('"', '""') + '"';
        })
        .join(","),
    )
    .join("\r\n");
}
