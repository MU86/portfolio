"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") || "/";

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "wrong password");
      }
      router.replace(from);
      router.refresh();
    } catch (e: any) {
      setError(e.message || "something broke");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="login-card" onSubmit={onSubmit}>
      <div className="login-tag">private preview</div>
      <h1 className="login-title">enter password</h1>
      <p className="login-sub">this site is in dev. ask mason for the password.</p>

      <input
        className="login-input"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="password"
        autoFocus
        autoComplete="current-password"
      />

      {error && <div className="login-err">{error}</div>}

      <button
        className="login-btn"
        type="submit"
        disabled={loading || !password}
      >
        {loading ? "checking…" : "enter"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="login-stage">
      <Suspense fallback={<div className="login-card"><div className="login-tag">loading…</div></div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
