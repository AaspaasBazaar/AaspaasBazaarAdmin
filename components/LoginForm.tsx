"use client";
import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    start(async () => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j?.error?.message ?? `Sign-in failed (HTTP ${res.status})`);
        return;
      }
      if (j.initial_setup) {
        setNotice("Password set. Redirecting…");
      }
      router.replace(next.startsWith("/") ? next : "/");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block">
        <span className="text-[12px] font-semibold text-sage-600">Email</span>
        <input
          type="email"
          required
          className="input-pill w-full mt-1 font-mono"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
          autoComplete="email"
        />
      </label>
      <label className="block">
        <span className="text-[12px] font-semibold text-sage-600">Password</span>
        <input
          type="password"
          required
          minLength={8}
          className="input-pill w-full mt-1"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <span className="text-[10.5px] text-sage-600 mt-1 block">
          First time signing in? The password you enter becomes your account password.
        </span>
      </label>
      {error && <p className="text-[12.5px] text-ruby-600">{error}</p>}
      {notice && <p className="text-[12.5px] text-leaf-700">{notice}</p>}
      <button
        type="submit"
        className="btn-primary w-full justify-center"
        disabled={pending || !email || password.length < 8}
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
