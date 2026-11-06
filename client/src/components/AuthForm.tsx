"use client";
import { useState, type FormEvent } from "react";
import { api, type User } from "../lib/api";
export function AuthForm({ onLogin }: { onLogin: (user: User) => void }) {
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const body = {
      email: form.get("email"),
      password: form.get("password"),
      ...(register ? { name: form.get("name") } : {}),
    };
    try {
      if (register) {
        await api("/auth/register", {
          method: "POST",
          body: JSON.stringify(body),
        });
        setRegister(false);
        setMessage("Account created. Log in to start your first task.");
      } else {
        const data = await api<{ user: User }>("/auth/login", {
          method: "POST",
          body: JSON.stringify(body),
        });
        onLogin(data.user);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to connect");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-layout">
      <section className="intro">
        <div className="eyebrow">TASKROOM / FULL STACK STARTER</div>
        <h1>
          Small tasks.
          <br />
          Real progress.
        </h1>
        <p>
          One place to plan your work, finish what matters, and learn how a full
          stack application fits together.
        </p>
        <div className="feature-note">
          Next.js + TypeScript
          <br />
          Express + MongoDB
          <br />
          Your tasks. Your pace.
        </div>
      </section>
      <section className="panel auth-panel">
        <div className="eyebrow">LET’S GET STARTED</div>
        <h2>{register ? "Create your account" : "Welcome back"}</h2>
        <p className="muted">
          {register
            ? "Your first task is just a minute away."
            : "Log in to your personal workspace."}
        </p>
        <form onSubmit={submit}>
          {register && (
            <label>
              Your name
              <input
                name="name"
                required
                minLength={2}
                maxLength={60}
                autoComplete="name"
              />
            </label>
          )}
          <label>
            Email address
            <input
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              required
              minLength={8}
              maxLength={72}
              autoComplete={register ? "new-password" : "current-password"}
            />
          </label>
          <small className="muted">
            At least 8 characters; at most 72 UTF-8 bytes.
          </small>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="success">
              {message}
            </p>
          )}
          <button className="primary full" disabled={busy}>
            {busy ? "Please wait…" : register ? "Create account" : "Log in"}
          </button>
        </form>
        <button
          className="text-button"
          disabled={busy}
          onClick={() => {
            setRegister(!register);
            setError("");
            setMessage("");
          }}
        >
          {register
            ? "Already registered? Log in"
            : "New here? Create an account"}
        </button>
        <p className="footnote">
          Your session uses an HttpOnly cookie. No token is stored in
          localStorage.
        </p>
      </section>
    </main>
  );
}
