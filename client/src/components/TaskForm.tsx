"use client";
import { useState, type FormEvent } from "react";
import { api, type Task } from "../lib/api";
export function TaskForm({
  task,
  onSaved,
  onCancel,
  onError,
}: {
  task: Task | null;
  onSaved: () => void;
  onCancel: () => void;
  onError: (e: unknown) => void;
}) {
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = event.currentTarget;
    const values = new FormData(form);
    const date = String(values.get("dueDate"));
    // Date-only input uses UTC midnight; display dates with UTC too, avoiding timezone shifts.
    const body = {
      title: values.get("title"),
      description: values.get("description"),
      priority: values.get("priority"),
      dueDate: date ? `${date}T00:00:00.000Z` : null,
      tags: String(values.get("tags"))
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    try {
      await api(task ? `/tasks/${task._id}` : "/tasks", {
        method: task ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      if (!task) form.reset();
      onSaved();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel composer">
      <div className="eyebrow">
        {task ? "MAKE AN ADJUSTMENT" : "CAPTURE YOUR NEXT STEP"}
      </div>
      <h2>{task ? "Edit task" : "Add a task"}</h2>
      <form onSubmit={submit}>
        <label>
          Title
          <input
            name="title"
            placeholder="What needs to get done?"
            defaultValue={task?.title}
            required
            maxLength={120}
          />
        </label>
        <label>
          Description
          <textarea
            name="description"
            rows={3}
            placeholder="A little context helps…"
            defaultValue={task?.description}
            maxLength={2000}
          />
        </label>
        <div className="two-cols">
          <label>
            Priority
            <select name="priority" defaultValue={task?.priority ?? "medium"}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <label>
            Due date
            <input
              name="dueDate"
              type="date"
              defaultValue={task?.dueDate?.slice(0, 10)}
            />
          </label>
        </div>
        <label>
          Tags
          <input
            name="tags"
            placeholder="learning, work"
            defaultValue={task?.tags.join(", ")}
          />
          <small className="muted">Up to 5 tags, separated by commas.</small>
        </label>
        <div className="actions">
          <button className="primary" disabled={busy}>
            {busy ? "Saving…" : task ? "Save changes" : "+ Add task"}
          </button>
          {task && (
            <button type="button" onClick={onCancel} disabled={busy}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
