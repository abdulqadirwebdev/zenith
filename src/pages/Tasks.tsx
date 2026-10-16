import { useState } from "react";
import {
  Plus,
  Play,
  Copy,
  Archive,
  Trash2,
  GripVertical,
  Search,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTasks } from "../hooks/useData";
import { db, makeTask, completeTask, deleteTasks, uid } from "../db";
import { startTimer } from "../services/timer";
import { act, toast, useUI } from "../stores/ui";
import type { Task } from "../types";
import { Empty, PageHeading, Tabs } from "../components/ui";
import TaskEditor from "../components/tasks/TaskEditor";
function TaskRow({
  task,
  selected,
  select,
  edit,
}: {
  task: Task;
  selected: boolean;
  select: () => void;
  edit: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });
  return (
    <div
      className={"task-row " + (isDragging ? "dragging" : "")}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        className="grip icon"
        aria-label={"Reorder " + task.title}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>
      <input
        type="checkbox"
        aria-label={"Select " + task.title}
        checked={selected}
        onChange={select}
      />
      <button
        aria-label={"Complete " + task.title}
        className={"task-check " + (task.status === "completed" ? "done" : "")}
        onClick={() => act(completeTask(task.id, task.status !== "completed"))}
      >
        {task.status === "completed" ? "✓" : ""}
      </button>
      <button className="task-title" onClick={edit}>
        <strong className={task.status === "completed" ? "strike" : ""}>
          {task.title}
        </strong>
        <small>
          {task.subject} · {Math.round(task.actual)} / {task.estimate} min
          {task.due ? " · Due " + task.due.replace("T", " ") : ""}
        </small>
      </button>
      <span className={"badge " + task.priority}>{task.priority}</span>
      <button
        className="icon"
        title="Start task"
        aria-label={"Start " + task.title}
        onClick={() =>
          act(
            startTimer(Math.max(1, task.estimate - task.actual), task.id).then(
              () => useUI.getState().setPage("Focus Studio"),
            ),
          )
        }
      >
        <Play size={17} />
      </button>
      <button
        className="icon"
        aria-label={"Duplicate " + task.title}
        onClick={() =>
          act(
            db.tasks
              .add({
                ...task,
                id: uid(),
                title: task.title + " (copy)",
                actual: 0,
                status: "backlog",
                completed: undefined,
                created: Date.now(),
                order: Date.now(),
              })
              .then(() => toast("Task duplicated")),
          )
        }
      >
        <Copy size={16} />
      </button>
    </div>
  );
}
export default function Tasks() {
  const tasks = useTasks();
  const [query, setQuery] = useState("");
  const [view, setView] = useState("List");
  const [filter, setFilter] = useState("Active");
  const [sort, setSort] = useState("Manual");
  const [selected, setSelected] = useState<string[]>([]);
  const [edit, setEdit] = useState<Task | null | undefined>();
  const [title, setTitle] = useState("");
  const [estimate, setEstimate] = useState("");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  let visible = tasks.filter(
    (t) =>
      (filter === "Archived" ? t.archived : !t.archived) &&
      (filter !== "Completed" || t.status === "completed") &&
      `${t.title} ${t.subject} ${t.tags.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  if (sort !== "Manual")
    visible = [...visible].sort((a, b) =>
      sort === "Duration"
        ? a.estimate - b.estimate
        : sort === "Priority"
          ? ["urgent", "high", "medium", "low"].indexOf(a.priority) -
            ["urgent", "high", "medium", "low"].indexOf(b.priority)
          : sort === "Status"
            ? a.status.localeCompare(b.status)
            : (a.due || "9999").localeCompare(b.due || "9999"),
    );
  async function remove() {
    if (!confirm(`Delete ${selected.length} selected tasks?`)) return;
    const originals = tasks.filter((t) => selected.includes(t.id));
    await deleteTasks(selected);
    setSelected([]);
    toast("Deleted. Use Undo deletion to restore task records.");
    setUndo(originals);
  }
  const [undo, setUndo] = useState<Task[]>([]);
  const render = (t: Task) => (
    <TaskRow
      key={t.id}
      task={t}
      selected={selected.includes(t.id)}
      select={() =>
        setSelected(
          selected.includes(t.id)
            ? selected.filter((x) => x !== t.id)
            : [...selected, t.id],
        )
      }
      edit={() => setEdit(t)}
    />
  );
  return (
    <>
      <PageHeading
        title="My Tasks"
        description="A clear mind starts with a clear next step."
      >
        <button className="primary" onClick={() => setEdit(null)}>
          <Plus size={18} />
          New task
        </button>
      </PageHeading>
      <div className="panel">
        <form
          className="quick-add"
          onSubmit={(e) => {
            e.preventDefault();
            act(
              db.tasks.add(makeTask(title, Number(estimate))).then(() => {
                setTitle("");
                setEstimate("");
                toast("Task added");
              }),
            );
          }}
        >
          <Plus size={18} />
          <input
            aria-label="Quick task title"
            placeholder="What do you want to work on?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <input
            aria-label="Estimated minutes"
            placeholder="Minutes"
            type="number"
            min="1"
            required
            value={estimate}
            onChange={(e) => setEstimate(e.target.value)}
          />
          <button type="submit">Add task</button>
        </form>
        <div className="toolbar">
          <div className="search-input">
            <Search size={16} />
            <input
              aria-label="Search tasks"
              placeholder="Search tasks, subjects, tags…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Tabs
            values={["List", "Board", "Grouped"]}
            value={view}
            onChange={setView}
          />
          <select
            aria-label="Task filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {["Active", "Completed", "Archived"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <select
            aria-label="Sort tasks"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {["Manual", "Due date", "Priority", "Duration", "Status"].map(
              (x) => (
                <option key={x}>{x}</option>
              ),
            )}
          </select>
        </div>
        {selected.length > 0 && (
          <div className="toolbar">
            <span>{selected.length} selected</span>
            <button
              onClick={() =>
                act(Promise.all(selected.map((id) => completeTask(id, true))))
              }
            >
              Complete
            </button>
            <button
              onClick={() =>
                act(
                  db.tasks
                    .where("id")
                    .anyOf(selected)
                    .modify({ archived: true })
                    .then(() => setSelected([])),
                )
              }
            >
              <Archive size={16} />
              Archive
            </button>
            <button className="danger" onClick={() => act(remove())}>
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        )}
        {undo.length > 0 && (
          <button
            onClick={() => act(db.tasks.bulkPut(undo).then(() => setUndo([])))}
          >
            Undo deletion
          </button>
        )}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={({ active, over }) => {
            if (over && active.id !== over.id) {
              const ordered = arrayMove(
                visible,
                visible.findIndex((t) => t.id === active.id),
                visible.findIndex((t) => t.id === over.id),
              );
              act(
                db.tasks.bulkPut(ordered.map((t, i) => ({ ...t, order: i }))),
              );
            }
          }}
        >
          <SortableContext items={visible.map((t) => t.id)}>
            {view === "List" ? (
              visible.map(render)
            ) : (
              <div className={view === "Board" ? "board" : "grouped"}>
                {(view === "Board"
                  ? ["backlog", "planned", "in progress", "paused", "completed"]
                  : [...new Set(visible.map((t) => t.subject))]
                ).map((group) => (
                  <section key={group}>
                    <h3>{group}</h3>
                    {visible
                      .filter(
                        (t) =>
                          (view === "Board" ? t.status : t.subject) === group,
                      )
                      .map(render)}
                  </section>
                ))}
              </div>
            )}
          </SortableContext>
        </DndContext>
        {!visible.length && (
          <Empty
            title="Room for your next idea"
            body="Add a task and give it a time estimate. You’ll know exactly what your day can hold."
          />
        )}
      </div>
      {edit !== undefined && (
        <TaskEditor
          task={edit ?? undefined}
          onClose={() => setEdit(undefined)}
        />
      )}
    </>
  );
}
