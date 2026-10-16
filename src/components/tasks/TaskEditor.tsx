import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { db, makeTask, uid, completeTask } from "../../db";
import type { Task } from "../../types";
import { Modal } from "../ui";
import { act, toast } from "../../stores/ui";
export default function TaskEditor({
  task,
  onClose,
}: {
  task?: Task;
  onClose: () => void;
}) {
  const [draft, set] = useState<Task>(task ?? makeTask("New task", 25));
  const patch = (v: Partial<Task>) => set({ ...draft, ...v });
  async function save() {
    if (
      !draft.title.trim() ||
      !Number.isFinite(draft.estimate) ||
      draft.estimate <= 0
    )
      throw Error("Enter a title and an estimate greater than zero.");
    await db.tasks.put({ ...draft, title: draft.title.trim() });
    if (draft.status === "completed") await completeTask(draft.id, true);
    else if (task?.status === "completed")
      await db.tasks.update(draft.id, { completed: undefined });
    toast("Task saved");
    onClose();
  }
  return (
    <Modal title={task ? "Edit task" : "Create a task"} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          act(save());
        }}
      >
        <label>
          Task title
          <input
            autoFocus
            required
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
          />
        </label>
        <label>
          Description
          <textarea
            value={draft.description}
            onChange={(e) => patch({ description: e.target.value })}
          />
        </label>
        <div className="form-grid">
          <label>
            Time estimate (minutes)
            <input
              required
              type="number"
              min="1"
              max="100000"
              value={draft.estimate}
              onChange={(e) => patch({ estimate: Number(e.target.value) })}
            />
          </label>
          <label>
            Subject / project
            <input
              value={draft.subject}
              onChange={(e) => patch({ subject: e.target.value })}
            />
          </label>
          <label>
            Priority
            <select
              value={draft.priority}
              onChange={(e) =>
                patch({ priority: e.target.value as Task["priority"] })
              }
            >
              {["low", "medium", "high", "urgent"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              value={draft.status}
              onChange={(e) =>
                patch({ status: e.target.value as Task["status"] })
              }
            >
              {["backlog", "planned", "in progress", "paused", "completed"].map(
                (v) => (
                  <option key={v}>{v}</option>
                ),
              )}
            </select>
          </label>
          <label>
            Due date / time
            <input
              type="datetime-local"
              value={draft.due.length === 10 ? draft.due + "T23:59" : draft.due}
              onChange={(e) => patch({ due: e.target.value })}
            />
          </label>
          <label>
            Repeat
            <select
              value={draft.recurrence}
              onChange={(e) =>
                patch({ recurrence: e.target.value as Task["recurrence"] })
              }
            >
              <option>none</option>
              <option>daily</option>
              <option>weekly</option>
            </select>
          </label>
          <label>
            Tags (comma separated)
            <input
              value={draft.tags.join(", ")}
              onChange={(e) =>
                patch({ tags: e.target.value.split(",").map((s) => s.trim()) })
              }
            />
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
        <label>
          Notes
          <textarea
            value={draft.notes}
            onChange={(e) => patch({ notes: e.target.value })}
          />
        </label>
        <h3>Subtasks</h3>
        {draft.subtasks.map((s) => (
          <div className="row" key={s.id}>
            <input
              aria-label={"Complete " + s.title}
              type="checkbox"
              checked={s.done}
              onChange={(e) =>
                patch({
                  subtasks: draft.subtasks.map((x) =>
                    x.id === s.id ? { ...x, done: e.target.checked } : x,
                  ),
                })
              }
            />
            <input
              aria-label="Subtask title"
              value={s.title}
              onChange={(e) =>
                patch({
                  subtasks: draft.subtasks.map((x) =>
                    x.id === s.id ? { ...x, title: e.target.value } : x,
                  ),
                })
              }
            />
            <button
              type="button"
              className="icon"
              aria-label="Delete subtask"
              onClick={() =>
                patch({ subtasks: draft.subtasks.filter((x) => x.id !== s.id) })
              }
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="ghost"
          onClick={() =>
            patch({
              subtasks: [
                ...draft.subtasks,
                { id: uid(), title: "", done: false },
              ],
            })
          }
        >
          <Plus size={16} />
          Add subtask
        </button>
        <footer className="modal-actions">
          <span className="muted">
            Tracked: {Math.round(draft.actual)} minutes
          </span>
          <button className="primary" type="submit">
            Save task
          </button>
        </footer>
      </form>
    </Modal>
  );
}
