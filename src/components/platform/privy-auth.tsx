"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";

import type { TxPayload } from "@/lib/tx";

interface PrivyAuthProps {
  onResolvedUserId: (userId: string) => void;
  onWalletExecutorReady?: (executor: ((payload: TxPayload) => Promise<string[]>) | null) => void;
}

interface ProfileResponse {
  profile: {
    username: string | null;
    walletAddress: string | null;
    referralCode: string | null;
  };
  source: "supabase" | "memory";
  warning?: string;
}

function usernameKey(userId: string) {
  return `lumma:username:${userId}`;
}

export function PrivyAuth({ onResolvedUserId, onWalletExecutorReady }: PrivyAuthProps) {
  const { ready, authenticated, login, logout, user, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const [usernameInput, setUsernameInput] = useState("");
  const [savedUsername, setSavedUsername] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const primaryWallet = useMemo(() => wallets[0] ?? null, [wallets]);

  const executeTxPayload = useCallback(
    async (payload: TxPayload) => {
      if (payload.mode !== "onchain" || !payload.steps.length) {
        return [];
      }
      if (!primaryWallet) {
        throw new Error("No connected wallet found. Connect wallet with Privy first.");
      }
      await primaryWallet.switchChain(payload.chainId);
      const provider = await primaryWallet.getEthereumProvider();
      const hashes: string[] = [];
      for (const step of payload.steps) {
        const hash = await provider.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: primaryWallet.address,
              to: step.to,
              data: step.data,
              value: step.value,
            },
          ],
        });
        hashes.push(String(hash));
      }
      return hashes;
    },
    [primaryWallet],
  );

  useEffect(() => {
    if (typeof onWalletExecutorReady !== "function") {
      return;
    }
    if (!authenticated) {
      onWalletExecutorReady(null);
      return;
    }
    onWalletExecutorReady(executeTxPayload);
  }, [authenticated, executeTxPayload, onWalletExecutorReady]);

  const loadProfile = useCallback(
    async (userId: string) => {
      const response = await fetch("/api/user/profile", {
        cache: "no-store",
        headers: { "x-user-id": userId },
      });
      const payload = (await response.json()) as { ok: boolean; data?: ProfileResponse; error?: string };
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? "Failed to load profile.");
      }

      const usernameFromApi = payload.data.profile.username;
      const cachedUsername = window.localStorage.getItem(usernameKey(userId));
      const resolvedUsername = usernameFromApi ?? cachedUsername;

      setSavedUsername(resolvedUsername);
      if (resolvedUsername) {
        setUsernameInput(resolvedUsername);
      }

      if (usernameFromApi) {
        window.localStorage.setItem(usernameKey(userId), usernameFromApi);
      }

      if (payload.data.source !== "supabase") {
        setStatus(
          payload.data.warning ??
            "Profile API is using temporary memory storage. Run Supabase migrations to persist usernames.",
        );
      } else {
        setStatus("");
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      if (!authenticated || !user?.id) {
        return;
      }
      onResolvedUserId(user.id);
      try {
        const token = await getAccessToken();
        if (token) {
          await fetch("/api/auth/privy/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
        }
        if (!cancelled) {
          await loadProfile(user.id);
        }
      } catch (error) {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : "Failed to sync wallet profile.");
        }
      }
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [authenticated, getAccessToken, loadProfile, onResolvedUserId, user]);

  async function saveUsername() {
    if (!authenticated || !user?.id) {
      setStatus("Connect wallet first.");
      return;
    }
    const normalized = usernameInput.trim().toLowerCase();
    if (!normalized) {
      setStatus("Enter a username before saving.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
        body: JSON.stringify({
          username: normalized,
          walletAddress: primaryWallet?.address ?? undefined,
        }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        data?: ProfileResponse;
        error?: string;
      };
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? "Failed to save username.");
      }
      const username = payload.data.profile.username ?? normalized;
      setSavedUsername(username);
      setUsernameInput(username);
      window.localStorage.setItem(usernameKey(user.id), username);
      setStatus(
        payload.data.source === "supabase"
          ? "Username saved to Supabase."
          : (payload.data.warning ?? "Saved locally. Supabase sync is not active."),
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save username.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-lumma-ink/20 bg-[var(--lumma-panel-strong)] p-4 backdrop-blur">
      <p className="font-semibold text-lumma-ink">Privy Wallet Access</p>
      <p className="mt-1 text-sm text-lumma-ink/75">
        Login with external wallet using Privy, then pick a username to persist in Supabase.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!ready && <span className="text-sm text-lumma-ink/70">Loading auth...</span>}
        {ready && !authenticated && (
          <>
            <button
              onClick={() => login({ loginMethods: ["wallet"] })}
              className="rounded-xl bg-lumma-ink px-3 py-2 text-sm font-semibold text-[var(--lumma-bg)] transition hover:opacity-90"
            >
              Login With Wallet
            </button>
            <button
              onClick={() => login()}
              className="rounded-xl border border-lumma-ink/30 px-3 py-2 text-sm font-semibold text-lumma-ink transition hover:bg-lumma-ink hover:text-[var(--lumma-bg)]"
            >
              Open All Login Methods
            </button>
          </>
        )}
        {ready && authenticated && (
          <>
            <span className="rounded-lg border border-lumma-ink/20 bg-lumma-sand/70 px-2 py-1 text-xs text-lumma-ink">
              User: {user?.id}
            </span>
            <button
              onClick={logout}
              className="rounded-xl border border-lumma-ink/30 px-3 py-2 text-sm font-semibold text-lumma-ink transition hover:bg-lumma-ink hover:text-[var(--lumma-bg)]"
            >
              Disconnect
            </button>
          </>
        )}
      </div>

      {authenticated && (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-lumma-ink/15 bg-lumma-sand/60 px-3 py-2 text-sm text-lumma-ink/80">
            Connected Wallets: {wallets.length ? wallets.map((wallet) => wallet.address).join(", ") : "none yet"}
          </div>
          <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
            <label className="text-sm text-lumma-ink">
              Username
              <input
                value={usernameInput}
                onChange={(event) => setUsernameInput(event.target.value.toLowerCase())}
                placeholder="your_name"
                className="mt-1 w-full rounded-lg border border-lumma-ink/25 bg-[var(--lumma-panel)] px-3 py-2 text-sm text-lumma-ink"
              />
            </label>
            <button
              onClick={() => void saveUsername()}
              disabled={saving}
              className="h-fit rounded-xl bg-lumma-ink px-3 py-2 text-sm font-semibold text-[var(--lumma-bg)] disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Username"}
            </button>
          </div>
          <p className="text-xs text-lumma-ink/70">
            {savedUsername ? `Current username: ${savedUsername}` : "No username set yet."}
          </p>
        </div>
      )}

      {status && <p className="mt-3 text-xs text-lumma-ink/80">{status}</p>}
    </div>
  );
}
