"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Copy, Loader2, LogOut, RefreshCw, Wallet } from "lucide-react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { formatUnits } from "viem";

import type { TxPayload } from "@/lib/tx";
import { cn } from "@/lib/utils";

interface PrivyAuthProps {
  onResolvedUserId: (userId: string) => void;
  onWalletExecutorReady?: (executor: ((payload: TxPayload) => Promise<string[]>) | null) => void;
}

interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: string;
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

interface UserSummaryResponse {
  summary: {
    user: {
      pointsSettled: number;
      pointsPending: number;
    };
  };
  referrals: {
    referralCode: string;
    totalInvites: number;
    activeInvites: number;
    rewardsEarned: number;
  };
}

function usernameKey(userId: string) {
  return `lumma:username:${userId}`;
}

function shortAddress(address?: string | null) {
  if (!address) return "No wallet";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
}

function formatBalance(balance: bigint) {
  const value = Number(formatUnits(balance, 6));
  if (!Number.isFinite(value)) return "--";
  if (value >= 1000) return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`;
  return `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} USDC`;
}

export function PrivyAuth({ onResolvedUserId, onWalletExecutorReady }: PrivyAuthProps) {
  const { ready, authenticated, login, logout, user, getAccessToken } = usePrivy();
  const { wallets } = useWallets();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [savedUsername, setSavedUsername] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileResponse["profile"] | null>(null);
  const [summary, setSummary] = useState<UserSummaryResponse | null>(null);
  const [walletBalance, setWalletBalance] = useState("--");

  const primaryWallet = useMemo(() => wallets[0] ?? null, [wallets]);
  const referralCode = summary?.referrals.referralCode ?? profile?.referralCode ?? "---";

  const refreshWalletBalance = useCallback(async () => {
    if (!primaryWallet) {
      setWalletBalance("--");
      return;
    }
    try {
      const provider = await primaryWallet.getEthereumProvider();
      const balanceHex = (await provider.request({
        method: "eth_getBalance",
        params: [primaryWallet.address, "latest"],
      })) as string;
      const parsed = BigInt(balanceHex);
      setWalletBalance(formatBalance(parsed));
    } catch {
      setWalletBalance("--");
    }
  }, [primaryWallet]);

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
      void refreshWalletBalance();
      return hashes;
    },
    [primaryWallet, refreshWalletBalance],
  );

  useEffect(() => {
    if (typeof onWalletExecutorReady !== "function") return;
    if (!authenticated) {
      onWalletExecutorReady(null);
      return;
    }
    onWalletExecutorReady(executeTxPayload);
  }, [authenticated, executeTxPayload, onWalletExecutorReady]);

  const loadProfileAndSummary = useCallback(
    async (userId: string) => {
      setSyncing(true);
      try {
        const [profileResponse, summaryResponse] = await Promise.all([
          fetch("/api/user/profile", {
            cache: "no-store",
            headers: { "x-user-id": userId },
          }),
          fetch("/api/user/summary", {
            cache: "no-store",
            headers: { "x-user-id": userId },
          }),
        ]);

        const profilePayload = (await profileResponse.json()) as ApiEnvelope<ProfileResponse>;
        const summaryPayload = (await summaryResponse.json()) as ApiEnvelope<UserSummaryResponse>;

        if (!profileResponse.ok || !profilePayload.ok || !profilePayload.data) {
          throw new Error(profilePayload.error ?? "Failed to load user profile.");
        }
        if (!summaryResponse.ok || !summaryPayload.ok || !summaryPayload.data) {
          throw new Error(summaryPayload.error ?? "Failed to load user summary.");
        }

        const apiProfile = profilePayload.data.profile;
        const fallbackUsername = window.localStorage.getItem(usernameKey(userId));
        const resolvedUsername = apiProfile.username ?? fallbackUsername ?? null;

        setProfile(apiProfile);
        setSummary(summaryPayload.data);
        setSavedUsername(resolvedUsername);
        setUsernameInput(resolvedUsername ?? "");
        if (resolvedUsername) {
          window.localStorage.setItem(usernameKey(userId), resolvedUsername);
        }

        if (profilePayload.data.source === "memory") {
          setStatus(
            profilePayload.data.warning ??
              "Supabase service role key missing; profile is running in temporary memory mode.",
          );
        } else {
          setStatus("");
        }
      } finally {
        setSyncing(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!authenticated || !user?.id) {
      onResolvedUserId("demo-user");
      setOpen(false);
      setSavedUsername(null);
      setUsernameInput("");
      setProfile(null);
      setSummary(null);
      setWalletBalance("--");
      return;
    }

    let cancelled = false;
    const userId = user.id;
    onResolvedUserId(userId);

    async function bootstrap() {
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
          await loadProfileAndSummary(userId);
          await refreshWalletBalance();
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
  }, [authenticated, getAccessToken, loadProfileAndSummary, onResolvedUserId, refreshWalletBalance, user?.id]);

  useEffect(() => {
    void refreshWalletBalance();
  }, [refreshWalletBalance]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!open) return;
      const target = event.target as Node | null;
      if (target && containerRef.current && !containerRef.current.contains(target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const saveUsername = useCallback(async () => {
    if (!authenticated || !user?.id) {
      setStatus("Connect wallet first.");
      return;
    }
    const normalized = normalizeUsername(usernameInput);
    if (!normalized || normalized.length < 3) {
      setStatus("Username must be 3-20 chars with letters, numbers, or underscore.");
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
      const payload = (await response.json()) as ApiEnvelope<ProfileResponse>;
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? "Failed to save username.");
      }

      const nextUsername = payload.data.profile.username ?? normalized;
      setSavedUsername(nextUsername);
      setUsernameInput(nextUsername);
      window.localStorage.setItem(usernameKey(user.id), nextUsername);
      setProfile(payload.data.profile);
      setStatus(
        payload.data.source === "supabase"
          ? "Username saved to Supabase."
          : (payload.data.warning ?? "Saved in memory mode."),
      );
      await loadProfileAndSummary(user.id);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save username.");
    } finally {
      setSaving(false);
    }
  }, [authenticated, loadProfileAndSummary, primaryWallet?.address, user?.id, usernameInput]);

  const copyReferralCode = useCallback(async () => {
    if (!referralCode || referralCode === "---") return;
    try {
      await navigator.clipboard.writeText(referralCode);
      setStatus("Referral code copied.");
    } catch {
      setStatus("Unable to copy referral code.");
    }
  }, [referralCode]);

  if (!ready) {
    return (
      <div className="inline-flex items-center gap-2 rounded-sm border border-white/20 bg-black/35 px-3 py-2 text-xs uppercase tracking-[0.12em] text-white/74">
        <Loader2 size={14} className="animate-spin" /> Loading wallet
      </div>
    );
  }

  if (!authenticated) {
    return (
      <button
        onClick={() => login({ loginMethods: ["wallet"] })}
        className="inline-flex items-center gap-2 rounded-sm border border-lumma-sky/58 bg-lumma-sky/14 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-lumma-sky transition hover:-translate-y-0.5"
      >
        <Wallet size={14} />
        Connect Wallet
      </button>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-2 rounded-sm border border-white/24 bg-black/42 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:-translate-y-0.5 hover:border-lumma-sky/60"
      >
        <Wallet size={14} className="text-lumma-sky" />
        <span>{savedUsername ?? shortAddress(primaryWallet?.address)}</span>
        <ChevronDown size={13} className={cn("transition", open && "rotate-180")} />
      </button>

      <div
        className={cn(
          "absolute right-0 z-40 mt-2 w-[20.5rem] rounded-sm border border-white/16 bg-[#070c15]/96 p-4 shadow-[0_30px_80px_-46px_rgba(3,9,18,0.92)] backdrop-blur",
          "max-sm:left-0 max-sm:right-auto max-sm:w-[min(92vw,20.5rem)]",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-white">{savedUsername ?? "Unnamed pilot"}</p>
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/62">{shortAddress(primaryWallet?.address)}</p>
          </div>
          <button
            onClick={() => {
              setOpen(false);
              logout();
            }}
            className="inline-flex items-center gap-1 rounded-sm border border-white/24 px-2 py-1 text-[11px] uppercase tracking-[0.1em] text-white/76 transition hover:border-lumma-alert/70 hover:text-lumma-alert"
          >
            <LogOut size={12} /> Exit
          </button>
        </div>

        <div className="rounded-sm border border-white/12 bg-black/36 p-3 text-xs text-white/84">
          <div className="flex items-center justify-between gap-2">
            <span>Wallet Balance</span>
            <button
              onClick={() => {
                void refreshWalletBalance();
                if (user?.id) {
                  void loadProfileAndSummary(user.id);
                }
              }}
              className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.1em] text-lumma-sky"
            >
              <RefreshCw size={11} className={cn(syncing && "animate-spin")} />
              Refresh
            </button>
          </div>
          <p className="mt-1 text-base font-semibold text-white">{walletBalance}</p>
          <p className="mt-2 text-[11px] text-white/62">Connected: {shortAddress(primaryWallet?.address ?? profile?.walletAddress)}</p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-sm border border-white/12 bg-black/34 p-2">
            <p className="text-white/62">Settled</p>
            <p className="mt-1 font-semibold text-white">
              {summary?.summary.user.pointsSettled.toLocaleString() ?? "0"}
            </p>
          </div>
          <div className="rounded-sm border border-white/12 bg-black/34 p-2">
            <p className="text-white/62">Pending</p>
            <p className="mt-1 font-semibold text-white">
              {summary?.summary.user.pointsPending.toLocaleString() ?? "0"}
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-sm border border-white/12 bg-black/34 p-2 text-xs text-white/86">
          <div className="flex items-center justify-between gap-2">
            <span>Referral Code</span>
            <button
              onClick={() => void copyReferralCode()}
              className="inline-flex items-center gap-1 rounded-sm border border-white/20 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-white/80 transition hover:border-lumma-sky/60 hover:text-lumma-sky"
            >
              <Copy size={11} /> Copy
            </button>
          </div>
          <p className="mt-1 font-semibold tracking-[0.08em] text-lumma-lime">{referralCode}</p>
          <p className="mt-1 text-[11px] text-white/62">
            Invites {summary?.referrals.totalInvites ?? 0} | Active {summary?.referrals.activeInvites ?? 0} | Rewards{" "}
            {(summary?.referrals.rewardsEarned ?? 0).toLocaleString()}
          </p>
        </div>

        <div className="mt-3 space-y-2">
          <label className="block text-[11px] uppercase tracking-[0.12em] text-white/62">
            Username
            <input
              value={usernameInput}
              onChange={(event) => setUsernameInput(normalizeUsername(event.target.value))}
              placeholder="your_name"
              className="mt-1 w-full rounded-sm border border-white/20 bg-black/45 px-2.5 py-2 text-sm text-white placeholder:text-white/35"
            />
          </label>
          <button
            onClick={() => void saveUsername()}
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-sm border border-lumma-sky/58 bg-lumma-sky/12 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-lumma-sky transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : null}
            {saving ? "Saving" : "Save Username"}
          </button>
        </div>

        {status && (
          <p className="mt-3 rounded-sm border border-white/14 bg-black/34 px-2 py-1.5 text-[11px] text-white/75">
            {status}
          </p>
        )}
      </div>
    </div>
  );
}
