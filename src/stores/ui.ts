import { create } from "zustand";
export const pages = [
  "Dashboard",
  "My Tasks",
  "Focus Studio",
  "Schedule",
  "Music & Ambience",
  "Break Studio",
  "Study Space",
  "Analytics",
  "Achievements",
  "Settings",
] as const;
export type Page = (typeof pages)[number];
interface UI {
  page: Page;
  collapsed: boolean;
  command: boolean;
  taskEditor: string | null;
  toast: string;
  celebration: string | null;
  setPage: (page: Page) => void;
  set: (v: Partial<UI>) => void;
}
export const useUI = create<UI>((set) => ({
  page: "Dashboard",
  collapsed: false,
  command: false,
  taskEditor: null,
  toast: "",
  celebration: null,
  setPage: (page) => set({ page }),
  set: (v) => set(v),
}));
let toastTimeout: ReturnType<typeof setTimeout>;
export function toast(message: string) {
  useUI.setState({ toast: message });
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => useUI.setState({ toast: "" }), 4500);
}
export function report(error: unknown) {
  toast(
    error instanceof Error
      ? error.message
      : "Something went wrong. Please try again.",
  );
}
export function act(promise: Promise<unknown>) {
  void promise.catch(report);
}
