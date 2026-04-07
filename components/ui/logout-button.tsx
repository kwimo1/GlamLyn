"use client";

import { useState } from "react";

export function LogoutButton({
  redirectTo,
  label = "Déconnexion",
}: {
  redirectTo: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = redirectTo;
  }

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      disabled={busy}
      className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line)] bg-white/70 px-4 text-sm font-semibold text-[var(--ink)] disabled:opacity-60"
    >
      {busy ? "Déconnexion..." : label}
    </button>
  );
}
