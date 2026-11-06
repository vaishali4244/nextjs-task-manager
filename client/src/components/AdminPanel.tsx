"use client";
import { useEffect, useState } from "react";
import { api, type TaskPage } from "../lib/api";
type UserPage = {
  users: { _id: string; name: string; email: string; role: string }[];
  total: number;
  pages: number;
};
export function AdminPanel({ onError }: { onError: (e: unknown) => void }) {
  const [tab, setTab] = useState<"users" | "tasks">("users");
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<UserPage | null>(null);
  const [tasks, setTasks] = useState<TaskPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    const request =
      tab === "users"
        ? api<UserPage>(`/admin/users?page=${page}&limit=10`)
        : api<TaskPage>(`/admin/tasks?page=${page}&limit=10`);
    request
      .then((data) => {
        if (active) {
          if ("users" in data) setUsers(data);
          else setTasks(data);
        }
      })
      .catch((e) => {
        if (active) {
          setFailed(true);
          onError(e);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tab, page, onError]);
  const result = tab === "users" ? users : tasks;
  return (
    <section className="panel">
      <div className="eyebrow">ADMIN ACCESS</div>
      <h2>Workspace overview</h2>
      <p className="muted">
        Read-only overview across accounts. Manage your own tasks in My tasks.
      </p>
      <div className="actions">
        <button
          onClick={() => {
            setTab("users");
            setPage(1);
          }}
          aria-pressed={tab === "users"}
        >
          Users
        </button>
        <button
          onClick={() => {
            setTab("tasks");
            setPage(1);
          }}
          aria-pressed={tab === "tasks"}
        >
          All tasks
        </button>
      </div>
      {loading ? (
        <p role="status">Loading overview…</p>
      ) : failed ? (
        <p>Could not load the overview.</p>
      ) : (
        <>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{tab === "users" ? "Name" : "Task"}</th>
                  <th>{tab === "users" ? "Email" : "Owner"}</th>
                  <th>{tab === "users" ? "Role" : "Status"}</th>
                </tr>
              </thead>
              <tbody>
                {tab === "users"
                  ? users?.users.map((u) => (
                      <tr key={u._id}>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td>{u.role}</td>
                      </tr>
                    ))
                  : tasks?.tasks.map((t) => (
                      <tr key={t._id}>
                        <td>{t.title}</td>
                        <td>
                          {typeof t.owner === "object" && t.owner
                            ? t.owner.email
                            : "Unavailable"}
                        </td>
                        <td>{t.completed ? "Finished" : "Pending"}</td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
          {result?.total === 0 && <p>No records yet.</p>}
          <div className="pagination">
            <button disabled={page === 1} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <span>
              Page {page} of {Math.max(1, result?.pages ?? 0)}
            </span>
            <button
              disabled={page >= (result?.pages ?? 0)}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </section>
  );
}
