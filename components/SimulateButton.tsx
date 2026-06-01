"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function SimulateButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() =>
        start(async () => {
          const res = await fetch("/api/simulate-order", { method: "POST" });
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            alert(j?.error?.message ?? `HTTP ${res.status}`);
            return;
          }
          router.refresh();
        })
      }
      disabled={pending}
      className="btn-primary"
    >
      {pending ? "Simulating…" : "+ Simulate order"}
    </button>
  );
}
