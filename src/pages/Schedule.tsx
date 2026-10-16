import { useState, type CSSProperties } from "react";
import {
  addDays,
  addMonths,
  format,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  isSameDay,
  startOfDay,
} from "date-fns";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Lock,
  CalendarDays,
  WandSparkles,
} from "lucide-react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensors,
  useSensor,
  KeyboardSensor,
} from "@dnd-kit/core";
import { useEvents, useTasks, usePrefs } from "../hooks/useData";
import { db, uid } from "../db";
import type { CalendarEvent } from "../types";
import {
  planDay,
  overlaps,
  expandedEvents,
  type Plan,
} from "../services/scheduler";
import { act, toast } from "../stores/ui";
import { PageHeading, Tabs, Modal, Empty } from "../components/ui";
function ResizeHandle({ event }: { event: CalendarEvent }) {
  const { setNodeRef, attributes, listeners } = useDraggable({
    id: "resize:" + event.id,
    disabled: event.locked,
  });
  return (
    <button
      ref={setNodeRef}
      className="event-resize"
      aria-label={"Resize " + event.title}
      {...attributes}
      {...listeners}
      disabled={event.locked}
    />
  );
}
function EventChip({
  event,
  edit,
}: {
  event: CalendarEvent;
  edit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: event.id,
    disabled: event.locked,
  });
  return (
    <div
      ref={setNodeRef}
      style={
        {
          "--event-height": `${((event.end - event.start) / 60000 / 60) * 66}px`,
          "--event-top": `${(new Date(event.start).getMinutes() / 60) * 66}px`,
          borderLeftColor: event.color,
          transform: transform
            ? `translate(${transform.x}px,${transform.y}px)`
            : undefined,
        } as CSSProperties
      }
      className="event-chip"
    >
      <button
        className="event-drag"
        aria-label={"Move " + event.title}
        {...attributes}
        {...listeners}
        disabled={event.locked}
      >
        {event.locked ? <Lock size={12} /> : <span>⠿</span>}
      </button>
      <button onClick={edit}>
        <small>
          {format(event.start, "HH:mm")} – {format(event.end, "HH:mm")}
        </small>
        <strong>{event.title}</strong>
      </button>
      <ResizeHandle event={event} />
    </div>
  );
}
function Slot({
  time,
  children,
  onClick,
}: {
  time: number;
  children: React.ReactNode;
  onClick: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: String(time) });
  return (
    <div
      ref={setNodeRef}
      className={"calendar-slot " + (isOver ? "drop-over" : "")}
    >
      <button
        className="slot-add"
        aria-label={"Add event " + format(time, "yyyy-MM-dd HH:mm")}
        onClick={onClick}
      />
      {children}
    </div>
  );
}
function EventEditor({
  event,
  onClose,
}: {
  event: CalendarEvent;
  onClose: () => void;
}) {
  const [draft, set] = useState(event);
  const events = useEvents();
  const tasks = useTasks();
  const patch = (v: Partial<CalendarEvent>) => set({ ...draft, ...v });
  const conflicts = expandedEvents(
    events.filter((e) => e.id !== draft.id),
    draft.start,
    draft.end,
  ).filter((e) => overlaps(e, draft));
  return (
    <Modal title="Calendar event" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.end <= draft.start) {
            toast("End must be after start.");
            return;
          }
          if (
            conflicts.length &&
            !confirm("This overlaps another event. Save anyway?")
          )
            return;
          act(
            db.events.put(draft).then(() => {
              toast("Event saved");
              onClose();
            }),
          );
        }}
      >
        <label>
          Title
          <input
            required
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
          />
        </label>
        <div className="form-grid">
          <label>
            Start
            <input
              required
              type="datetime-local"
              value={format(draft.start, "yyyy-MM-dd'T'HH:mm")}
              onChange={(e) => {
                if (e.target.value) patch({ start: +new Date(e.target.value) });
              }}
            />
          </label>
          <label>
            End
            <input
              required
              type="datetime-local"
              value={format(draft.end, "yyyy-MM-dd'T'HH:mm")}
              onChange={(e) => {
                if (e.target.value) patch({ end: +new Date(e.target.value) });
              }}
            />
          </label>
          <label>
            Kind
            <select
              value={draft.kind}
              onChange={(e) =>
                patch({ kind: e.target.value as CalendarEvent["kind"] })
              }
            >
              <option>study</option>
              <option>appointment</option>
              <option>break</option>
            </select>
          </label>
          <label>
            Repeat
            <select
              value={draft.recurrence}
              onChange={(e) =>
                patch({
                  recurrence: e.target.value as CalendarEvent["recurrence"],
                })
              }
            >
              <option>none</option>
              <option>daily</option>
              <option>weekly</option>
            </select>
          </label>
          <label>
            Linked task
            <select
              value={draft.taskId ?? ""}
              onChange={(e) => patch({ taskId: e.target.value || undefined })}
            >
              <option value="">None</option>
              {tasks.map((t) => (
                <option value={t.id} key={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Color
            <input
              type="color"
              value={draft.color}
              onChange={(e) => patch({ color: e.target.value })}
            />
          </label>
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={draft.locked}
            onChange={(e) => patch({ locked: e.target.checked })}
          />
          Lock this block
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={draft.allDay}
            onChange={(e) => {
              const start = +startOfDay(draft.start);
              patch(
                e.target.checked
                  ? { allDay: true, start, end: +addDays(start, 1) }
                  : { allDay: false },
              );
            }}
          />
          All day
        </label>
        {conflicts.length > 0 && (
          <p className="warning">
            Conflicts with {conflicts.map((e) => e.title).join(", ")}
          </p>
        )}
        <footer className="modal-actions">
          <button
            type="button"
            className="danger"
            onClick={() => {
              if (confirm("Delete this event and its recurring series?"))
                act(db.events.delete(draft.id).then(onClose));
            }}
          >
            Delete event
          </button>
          <button className="primary" type="submit">
            Save event
          </button>
        </footer>
        <p className="small muted">
          Editing a recurring event changes the entire series. Times follow your
          browser’s local timezone.
        </p>
      </form>
    </Modal>
  );
}
export default function Schedule() {
  const p = usePrefs(),
    tasks = useTasks(),
    events = useEvents();
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState("Week");
  const [edit, setEdit] = useState<CalendarEvent>();
  const [plan, setPlan] = useState<Plan>();
  const [replace, setReplace] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const start =
    view === "Week"
      ? startOfWeek(date, { weekStartsOn: p.weekStart })
      : view === "Month"
        ? startOfWeek(startOfMonth(date), { weekStartsOn: p.weekStart })
        : startOfDay(date);
  const days = Array.from(
    { length: view === "Week" ? 7 : view === "Month" ? 42 : 1 },
    (_, i) => addDays(start, i),
  );
  const visible = expandedEvents(events, +start, +addDays(start, days.length));
  const estimate = tasks
    .filter((t) => t.status !== "completed" && !t.archived)
    .reduce((n, t) => n + Math.max(0, t.estimate - t.actual), 0);
  const available = planDay([], events, p, date).capacity;
  function newEvent(time: number) {
    setEdit({
      id: uid(),
      title: "Study session",
      start: time,
      end: time + 30 * 60000,
      kind: "study",
      locked: false,
      color: p.accent,
      allDay: false,
      recurrence: "none",
    });
  }
  function preview(reschedule = false) {
    setReplace(reschedule);
    const retained = reschedule
      ? events.filter(
          (e) =>
            e.locked ||
            !e.taskId ||
            !isSameDay(e.start, date) ||
            e.start < Date.now() ||
            tasks.find((t) => t.id === e.taskId)?.status === "completed",
        )
      : events;
    setPlan(planDay(tasks, retained, p, date));
  }
  async function apply() {
    if (!plan) return;
    await db.transaction("rw", [db.events, db.tasks], async () => {
      if (replace)
        await db.events.bulkDelete(
          events
            .filter(
              (e) =>
                !e.locked &&
                e.taskId &&
                isSameDay(e.start, date) &&
                e.start >= Date.now() &&
                tasks.find((t) => t.id === e.taskId)?.status !== "completed",
            )
            .map((e) => e.id),
        );
      const existing = await db.events.toArray();
      if (
        plan.blocks.some((b) =>
          expandedEvents(existing, b.start, b.end).some((e) => overlaps(b, e)),
        )
      )
        throw Error("Your calendar changed. Generate a fresh preview.");
      await db.events.bulkAdd(plan.blocks.map((e) => ({ ...e, id: uid() })));
      for (const b of plan.blocks)
        if (b.taskId)
          await db.tasks.update(b.taskId, {
            status: "planned",
            scheduledStart: b.start,
          });
    });
    setPlan(undefined);
    toast("Schedule applied");
  }
  return (
    <>
      <PageHeading
        title="Your schedule"
        description="A realistic rhythm for everything that matters."
      >
        <button onClick={() => preview(true)}>Reschedule unfinished</button>
        <button className="primary" onClick={() => preview()}>
          <WandSparkles size={16} />
          Auto-Plan My Day
        </button>
      </PageHeading>
      <div className="capacity panel">
        <div>
          <strong>{Math.round((estimate / 60) * 10) / 10}h</strong>
          <span> estimated workload</span>
        </div>
        <div className="capacity-track">
          <i
            style={{
              width:
                Math.min(100, (estimate / Math.max(1, available)) * 100) + "%",
            }}
          />
        </div>
        <span>{Math.round((available / 60) * 10) / 10}h free</span>
        {estimate > available && (
          <span className="warning">
            Over capacity by{" "}
            {Math.round(((estimate - available) / 60) * 10) / 10}h
          </span>
        )}
      </div>
      <div className="calendar panel">
        <div className="toolbar">
          <button
            className="icon"
            aria-label="Previous period"
            onClick={() =>
              setDate(
                view === "Month"
                  ? addMonths(date, -1)
                  : addDays(date, view === "Week" ? -7 : -1),
              )
            }
          >
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => setDate(new Date())}>Today</button>
          <button
            className="icon"
            aria-label="Next period"
            onClick={() =>
              setDate(
                view === "Month"
                  ? addMonths(date, 1)
                  : addDays(date, view === "Week" ? 7 : 1),
              )
            }
          >
            <ChevronRight size={18} />
          </button>
          <h3>{format(date, "MMMM yyyy")}</h3>
          <Tabs
            values={["Day", "Week", "Month", "Agenda"]}
            value={view}
            onChange={setView}
          />
          <button onClick={() => newEvent(+date)}>
            <Plus size={16} />
            New event
          </button>
        </div>
        <DndContext
          sensors={sensors}
          onDragEnd={({ active, over }) => {
            const resizing = String(active.id).startsWith("resize:");
            const event = events.find(
              (e) => e.id === String(active.id).replace("resize:", ""),
            );
            if (!event || event.locked || !over) return;
            const start = Number(over.id);
            const next = {
              ...event,
              start: resizing ? event.start : start,
              end: resizing
                ? Math.max(event.start + 15 * 60000, start + 60 * 60000)
                : start + event.end - event.start,
            };
            if (
              expandedEvents(
                events.filter((e) => e.id !== event.id),
                next.start,
                next.end,
              ).some((e) => overlaps(e, next)) &&
              !confirm("This move creates a conflict. Continue?")
            )
              return;
            act(
              db.events
                .put(next)
                .then(() => toast(resizing ? "Event resized" : "Event moved")),
            );
          }}
        >
          {view === "Agenda" ? (
            <div className="agenda">
              {expandedEvents(
                events,
                +startOfDay(date),
                +addDays(date, 30),
              ).map((e) => (
                <div className="row" key={e.id + e.start}>
                  <span className="muted">{format(e.start, "EEE, MMM d")}</span>
                  <EventChip
                    event={e}
                    edit={() => setEdit(events.find((x) => x.id === e.id))}
                  />
                </div>
              ))}
              {!expandedEvents(events, +startOfDay(date), +addDays(date, 30))
                .length && (
                <Empty
                  title="A fresh page"
                  body="Click New event or auto-plan your tasks."
                />
              )}
            </div>
          ) : view === "Month" ? (
            <div className="month-grid">
              {days.map((day) => (
                <div
                  className={day > endOfMonth(date) ? "muted" : ""}
                  key={+day}
                >
                  <button className="ghost" onClick={() => newEvent(+day)}>
                    {format(day, "d")}
                  </button>
                  {visible
                    .filter((e) => isSameDay(e.start, day))
                    .map((e) => (
                      <EventChip
                        key={e.id + e.start}
                        event={e}
                        edit={() => setEdit(events.find((x) => x.id === e.id))}
                      />
                    ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="calendar-scroll">
              <div
                className="calendar-grid"
                style={{
                  gridTemplateColumns: `52px repeat(${days.length}, minmax(110px, 1fr))`,
                }}
              >
                <div />
                {days.map((day) => (
                  <div
                    className={
                      "day-heading " +
                      (isSameDay(day, new Date()) ? "today" : "")
                    }
                    key={+day}
                  >
                    <small>{format(day, "EEE")}</small>
                    <strong>{format(day, "d")}</strong>
                  </div>
                ))}
                {Array.from({ length: 18 }, (_, i) => i + 6).map((hour) => (
                  <div className="calendar-grid-row" key={hour}>
                    <span className="time-label">{hour}:00</span>
                    {days.map((day) => {
                      const time = new Date(day);
                      time.setHours(hour, 0, 0, 0);
                      return (
                        <Slot
                          key={+time}
                          time={+time}
                          onClick={() => newEvent(+time)}
                        >
                          {visible
                            .filter(
                              (e) =>
                                isSameDay(e.start, day) &&
                                new Date(e.start).getHours() === hour,
                            )
                            .map((e) => (
                              <EventChip
                                key={e.id + e.start}
                                event={e}
                                edit={() =>
                                  setEdit(events.find((x) => x.id === e.id))
                                }
                              />
                            ))}
                        </Slot>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DndContext>
      </div>
      <p className="small muted">
        Drag using the event handle. Edit start/end times to resize precisely.
        Locked blocks stay in place. Timezone:{" "}
        {Intl.DateTimeFormat().resolvedOptions().timeZone}.
      </p>
      {edit && <EventEditor event={edit} onClose={() => setEdit(undefined)} />}
      {plan && (
        <Modal title="Your proposed day" onClose={() => setPlan(undefined)}>
          <p>
            Deterministic planning: priority → earliest deadline → task order.
            Focus blocks fit your work hours and existing events, with breaks
            after {p.breakEvery} block(s).
          </p>
          {replace && (
            <p className="warning">
              Applying replaces future unlocked blocks on this day linked to
              incomplete tasks. Locked blocks are preserved.
            </p>
          )}
          <p>
            {plan.capacity.toFixed(0)} minutes available ·{" "}
            {plan.workload.toFixed(0)} minutes of work
          </p>
          {plan.blocks.map((b) => (
            <div className="preview-block" key={b.id}>
              <CalendarDays size={16} />
              <span>
                {format(b.start, "HH:mm")} – {format(b.end, "HH:mm")}
              </span>
              <strong>{b.title}</strong>
            </div>
          ))}
          {plan.unscheduled.map((t) => (
            <p className="warning" key={t.taskId}>
              {t.title}: {Math.round(t.minutes)}m unscheduled. {t.reason}
            </p>
          ))}
          {!plan.blocks.length && (
            <Empty
              title="No blocks proposed"
              body="Check working hours, remaining estimates, deadlines, or existing scheduled tasks."
            />
          )}
          <footer className="modal-actions">
            <button onClick={() => setPlan(undefined)}>Cancel</button>
            <button
              className="primary"
              disabled={!plan.blocks.length}
              onClick={() => act(apply())}
            >
              Apply schedule
            </button>
          </footer>
        </Modal>
      )}
    </>
  );
}
