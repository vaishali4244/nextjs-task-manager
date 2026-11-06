"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  api,
  ApiError,
  type User,
  type Task,
  type TaskPage,
  type Stats,
} from "../lib/api";
import { AuthForm } from "../components/AuthForm";
import { TaskForm } from "../components/TaskForm";
import { AdminPanel } from "../components/AdminPanel";
export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<"tasks" | "admin">("tasks");
  const [data, setData] = useState<TaskPage>({
    tasks: [],
    total: 0,
    page: 1,
    pages: 0,
  });
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    completed: 0,
    highPriority: 0,
  });
  const [filters, setFilters] = useState("");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const handleError = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.status === 401) {
      setUser(null);
      setEditing(null);
    }
    setError(e instanceof Error ? e.message : "Something went wrong");
  }, []);
  useEffect(() => {
    api<{ user: User }>("/auth/me")
      .then((d) => setUser(d.user))
      .catch((e) => {
        if (!(e instanceof ApiError && e.status === 401))
          setBootError(
            "Cannot reach the API. Start the Express server and check your .env settings.",
          );
      })
      .finally(() => setBooting(false));
  }, []);
  useEffect(() => {
    if (!user || tab !== "tasks") return;
    let active = true;
    setLoading(true);
    Promise.all([
      api<TaskPage>(`/tasks?page=${page}&limit=6&${filters}`),
      api<Stats>("/tasks/stats"),
    ])
      .then(([list, summary]) => {
        if (!active) return;
        if (page > 1 && page > list.pages) {
          setPage(Math.max(1, list.pages));
          return;
        }
        setData(list);
        setStats(summary);
      })
      .catch((e) => {
        if (active) handleError(e);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, page, filters, revision, tab, handleError]);
  function saved() {
    setEditing(null);
    setError("");
    setNotice("Task saved.");
    setRevision((v) => v + 1);
  }
  async function mutate(task: Task, remove = false) {
    if (
      remove &&
      !window.confirm(`Delete "${task.title}"? This cannot be undone.`)
    )
      return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(
        `/tasks/${task._id}`,
        remove
          ? { method: "DELETE" }
          : {
              method: "PATCH",
              body: JSON.stringify({ completed: !task.completed }),
            },
      );
      if (editing?._id === task._id) setEditing(null);
      setNotice(remove ? "Task deleted." : "Completion updated.");
      setRevision((v) => v + 1);
    } catch (e) {
      handleError(e);
    } finally {
      setBusy(false);
    }
  }
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const query = new URLSearchParams();
    values.forEach((value, key) => {
      if (String(value)) query.set(key, String(value));
    });
    setFilters(query.toString());
    setPage(1);
    setError("");
  }
  async function logout() {
    setBusy(true);
    try {
      await api("/auth/logout", { method: "POST" });
      setUser(null);
      setEditing(null);
      setTab("tasks");
      setError("");
    } catch (e) {
      handleError(e);
    } finally {
      setBusy(false);
    }
  }
  if (booting)
    return (
      <main className="loading" role="status">
        Opening your workspace…
      </main>
    );
  if (bootError)
    return (
      <main className="loading">
        <p role="alert">{bootError}</p>
        <button onClick={() => window.location.reload()}>
          Retry connection
        </button>
      </main>
    );
  if (!user)
    return (
      <>
        <AuthForm
          onLogin={(u) => {
            setUser(u);
            setPage(1);
            setFilters("");
            setTab("tasks");
            setError("");
            setNotice("");
          }}
        />
        {error && (
          <p className="session-error" role="alert">
            {error}
          </p>
        )}
      </>
    );
  return (
    <div className="workspace">
      <header>
        <a className="brand" href="/">
          ◈ Taskroom
        </a>
        <div className="account">
          <span>
            {user.name} <span className="badge">{user.role}</span>
          </span>
          <button disabled={busy} onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      <main>
        <div className="page-heading">
          <div>
            <div className="eyebrow">YOUR PERSONAL WORKSPACE</div>
            <h1>Make room for progress.</h1>
            <p className="muted">Plan a little. Focus on the next step.</p>
          </div>
          {user.role === "admin" && (
            <nav className="actions" aria-label="Workspace">
              <button
                aria-pressed={tab === "tasks"}
                onClick={() => setTab("tasks")}
              >
                My tasks
              </button>
              <button
                aria-pressed={tab === "admin"}
                onClick={() => setTab("admin")}
              >
                Admin
              </button>
            </nav>
          )}
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="success">
            {notice}
          </p>
        )}
        {tab === "admin" ? (
          <AdminPanel onError={handleError} />
        ) : (
          <>
            <section className="stats" aria-label="All your task statistics">
              {(
                [
                  ["Total tasks", stats.total],
                  ["In progress", stats.pending],
                  ["Finished", stats.completed],
                  ["High priority", stats.highPriority],
                ] as const
              ).map(([name, count]) => (
                <div className="stat" key={name}>
                  <span>{name}</span>
                  <strong>{count}</strong>
                </div>
              ))}
            </section>
            <div className="task-layout">
              <TaskForm
                key={editing?._id ?? "new"}
                task={editing}
                onSaved={saved}
                onCancel={() => setEditing(null)}
                onError={handleError}
              />
              <section className="task-section">
                <div className="section-title">
                  <h2>Your tasks</h2>
                  <span className="muted">{data.total} matching</span>
                </div>
                <form className="filters panel" onSubmit={search}>
                  <label className="search-label">
                    Search title
                    <input
                      name="title"
                      placeholder="Search your tasks…"
                      maxLength={120}
                    />
                  </label>
                  <div className="filter-row">
                    <label>
                      Status
                      <select name="completed">
                        <option value="">All statuses</option>
                        <option value="false">Pending</option>
                        <option value="true">Finished</option>
                      </select>
                    </label>
                    <label>
                      Priority
                      <select name="priority">
                        <option value="">All priorities</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </label>
                    <label>
                      Tag
                      <input
                        name="tag"
                        placeholder="e.g. work"
                        maxLength={30}
                      />
                    </label>
                  </div>
                  <div className="filter-row">
                    <label>
                      Sort by
                      <select name="sort">
                        <option value="createdAt">Created date</option>
                        <option value="dueDate">Due date</option>
                        <option value="title">Title</option>
                      </select>
                    </label>
                    <label>
                      Order
                      <select name="order">
                        <option value="desc">Descending</option>
                        <option value="asc">Ascending</option>
                      </select>
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" name="overdue" value="true" />{" "}
                      Overdue only
                    </label>
                  </div>
                  <div className="actions">
                    <button className="primary" disabled={loading}>
                      Apply filters
                    </button>
                    <button
                      type="reset"
                      onClick={() => {
                        setFilters("");
                        setPage(1);
                      }}
                    >
                      Reset
                    </button>
                  </div>
                </form>
                {loading ? (
                  <p className="empty" role="status">
                    Loading your tasks…
                  </p>
                ) : data.tasks.length === 0 ? (
                  <div className="empty panel">
                    <h3>A little breathing room.</h3>
                    <p>
                      No tasks match these filters. Add a task or reset your
                      search.
                    </p>
                  </div>
                ) : (
                  <div className="task-list">
                    {data.tasks.map((task) => (
                      <article
                        className={`task-card ${task.completed ? "is-done" : ""}`}
                        key={task._id}
                      >
                        <div className="task-main">
                          <input
                            type="checkbox"
                            aria-label={`Mark ${task.title} ${task.completed ? "pending" : "finished"}`}
                            checked={task.completed}
                            onChange={() => mutate(task)}
                            disabled={busy}
                          />
                          <div className="task-content">
                            <h3>{task.title}</h3>
                            {task.description && <p>{task.description}</p>}
                            <div className="task-meta">
                              <span className={`priority ${task.priority}`}>
                                {task.priority}
                              </span>
                              <span>
                                {task.completed ? "Finished" : "Pending"}
                              </span>
                              {task.dueDate && (
                                <span>
                                  Due{" "}
                                  {new Date(task.dueDate).toLocaleDateString(
                                    undefined,
                                    { timeZone: "UTC" },
                                  )}
                                </span>
                              )}
                              {task.tags.map((tag, i) => (
                                <span key={`${tag}-${i}`}>#{tag}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="actions">
                          <button
                            disabled={busy}
                            onClick={() => {
                              setEditing(task);
                              setNotice("");
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="danger"
                            disabled={busy}
                            onClick={() => mutate(task, true)}
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
                <div className="pagination">
                  <button
                    disabled={page === 1 || loading}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </button>
                  <span>
                    Page {page} of {Math.max(1, data.pages)}
                  </span>
                  <button
                    disabled={page >= data.pages || loading}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </button>
                </div>
              </section>
            </div>
          </>
        )}
        <footer>Built to learn. Designed to get things done.</footer>
      </main>
    </div>
  );
}
