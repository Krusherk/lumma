"use client";

import { useState } from "react";

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState("");

  async function updatePause(nextPaused: boolean) {
    try {
      const response = await fetch("/api/admin/vaults/pause", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token,
        },
        body: JSON.stringify({ paused: nextPaused }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        data?: { paused: boolean };
        error?: string;
      };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Failed to update pause state.");
      }
      setPaused(payload.data?.paused ?? nextPaused);
      setStatus(`Vault pause set to ${nextPaused}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to update pause state.");
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-14">
      <h1 className="font-display text-3xl font-semibold text-lumma-ink">Lumma Admin</h1>
      <p className="mt-2 text-sm text-lumma-ink/70">
        Emergency control for testnet vault pause switch.
      </p>
      <div className="mt-6 rounded-2xl border border-lumma-ink/15 bg-white p-5">
        <label className="flex flex-col gap-2 text-sm text-lumma-ink">
          Admin API token
          <input
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            className="rounded-lg border border-lumma-ink/25 px-3 py-2"
          />
        </label>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => void updatePause(true)}
            className="rounded-lg bg-lumma-alert px-3 py-2 text-sm font-semibold text-lumma-ink"
          >
            Pause Vaults
          </button>
          <button
            onClick={() => void updatePause(false)}
            className="rounded-lg border border-lumma-ink/30 px-3 py-2 text-sm font-semibold text-lumma-ink"
          >
            Unpause Vaults
          </button>
          <span className="text-sm text-lumma-ink/80">Current: {paused ? "Paused" : "Live"}</span>
        </div>
        {status && <p className="mt-3 text-sm text-lumma-ink">{status}</p>}
      </div>
    </main>
  );
}

