"use client";

import Link from "next/link";
import {
  ArrowLeftRight,
  BadgeCheck,
  Gift,
  LayoutDashboard,
  Link2,
  ListTodo,
  Orbit,
  ShieldAlert,
  Sparkles,
  Trophy,
  Vault,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { LummaLogo } from "@/components/brand/lumma-logo";
import { PrivyAuth } from "@/components/platform/privy-auth";
import { taskDefinitions } from "@/lib/tasks";
import type { TxPayload } from "@/lib/tx";
import { cn } from "@/lib/utils";

type LeaderboardPeriod = "weekly" | "monthly" | "all_time";
type NftTier = "bronze" | "silver" | "gold" | "diamond";
type DashboardView =
  | "overview"
  | "vaults"
  | "swap"
  | "tasks"
  | "points"
  | "leaderboard"
  | "referrals"
  | "quests"
  | "nfts";

interface DashboardProps {
  view?: DashboardView;
}

interface VaultView {
  id: string;
  name: string;
  risk: string;
  apyMin: number;
  apyMax: number;
  estimatedApy: number;
  estimatedApyLabel: string;
  tvlUsd: number;
  txCapUsd: number;
  paused: boolean;
  position: {
    principalUsd: number;
    earnedUsd: number;
  };
}

interface AppSummary {
  summary: {
    user: {
      id: string;
      pointsSettled: number;
      pointsPending: number;
      referralCode: string;
      riskFlag: "none" | "review" | "blocked";
    };
    swaps: number;
    deposits: number;
    totalVaultValue: number;
  };
  referrals: {
    referralCode: string;
    totalInvites: number;
    activeInvites: number;
    rewardsEarned: number;
  };
  nft: {
    swaps: number;
    eligible: string[];
    claimed: string[];
  };
}

interface ApiEnvelope<T> {
  ok: boolean;
  data: T;
  error?: string;
}

interface MutationResponse {
  txPayload?: TxPayload;
}

interface SwapQuoteView {
  from: "USDC" | "EURC";
  to: "USDC" | "EURC";
  amount: number;
  rate: number;
  outAmount: number;
  mode?: "simulation" | "onchain";
  warning?: string;
  quote?: {
    minOut: number;
    fee: number;
    expiresAt: number;
    signature: string;
  };
}

interface QuestView {
  id: string;
  name: string;
  week: string;
  points: number;
  scarcity: number;
  status: "in_progress" | "completed";
  progress: {
    deposits: number;
    swaps: number;
    invite_active_friend: number;
    social_proof: number;
  };
  tasks: Array<{
    id: string;
    label: string;
    kind: string;
    target: number;
  }>;
}

const nftTiers: NftTier[] = ["bronze", "silver", "gold", "diamond"];
const privyEnabled = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);

const navItems: Array<{
  view: Exclude<DashboardView, "points">;
  href: string;
  label: string;
  icon: LucideIcon;
  blurb: string;
}> = [
  {
    view: "overview",
    href: "/app",
    label: "Overview",
    icon: LayoutDashboard,
    blurb: "Mission control across the whole protocol loop.",
  },
  {
    view: "vaults",
    href: "/app/vaults",
    label: "Vaults",
    icon: Vault,
    blurb: "Manage deposits and withdrawals by risk tier.",
  },
  {
    view: "swap",
    href: "/app/swap",
    label: "Swap",
    icon: ArrowLeftRight,
    blurb: "Run USDC/EURC swaps and track milestones.",
  },
  {
    view: "tasks",
    href: "/app/tasks",
    label: "Tasks + Points",
    icon: ListTodo,
    blurb: "Farm points through daily, social, and activity tasks.",
  },
  {
    view: "leaderboard",
    href: "/app/leaderboard",
    label: "Leaderboard",
    icon: Trophy,
    blurb: "Weekly, monthly, and all-time ranking boards.",
  },
  {
    view: "referrals",
    href: "/app/referrals",
    label: "Referrals",
    icon: Link2,
    blurb: "Track invite performance and referral rewards.",
  },
  {
    view: "quests",
    href: "/app/quests",
    label: "Yield Quests",
    icon: Orbit,
    blurb: "Complete mission chains and unlock multipliers.",
  },
  {
    view: "nfts",
    href: "/app/nfts",
    label: "NFT Milestones",
    icon: BadgeCheck,
    blurb: "Claim reward NFTs as swap counts climb.",
  },
];

async function api<T>(path: string, init: RequestInit = {}, userId: string): Promise<T> {
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId,
      ...(init.headers ?? {}),
    },
  });
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error ?? `Request failed (${response.status})`);
  }
  return payload.data;
}

function normalizeView(view: DashboardView): Exclude<DashboardView, "points"> {
  if (view === "points") {
    return "tasks";
  }
  return view;
}

export function Dashboard({ view = "overview" }: DashboardProps) {
  const currentView = normalizeView(view);

  const [userId, setUserId] = useState("demo-user");
  const [vaults, setVaults] = useState<VaultView[]>([]);
  const [summary, setSummary] = useState<AppSummary | null>(null);
  const [swaps, setSwaps] = useState<
    Array<{ id: string; from: string; to: string; amount: number; createdAt: string }>
  >([]);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<LeaderboardPeriod>("weekly");
  const [leaderboardRows, setLeaderboardRows] = useState<
    Array<{ userId: string; points: number; rank: number }>
  >([]);
  const [quests, setQuests] = useState<QuestView[]>([]);
  const [vaultInputs, setVaultInputs] = useState<Record<string, string>>({});
  const [swapAmount, setSwapAmount] = useState("100");
  const [swapDirection, setSwapDirection] = useState<"USDC_EURC" | "EURC_USDC">("USDC_EURC");
  const [referralCodeInput, setReferralCodeInput] = useState("");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [walletExecutor, setWalletExecutor] = useState<((payload: TxPayload) => Promise<string[]>) | null>(
    null,
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [vaultData, summaryData, swapData, leaderboardData, questData] = await Promise.all([
        api<{ userId: string; vaults: VaultView[] }>("/api/vaults", {}, userId),
        api<AppSummary>("/api/user/summary", {}, userId),
        api<{
          userId: string;
          history: Array<{ id: string; from: string; to: string; amount: number; createdAt: string }>;
        }>("/api/swaps/history", {}, userId),
        api<{ period: LeaderboardPeriod; rows: Array<{ userId: string; points: number; rank: number }> }>(
          `/api/leaderboard?period=${leaderboardPeriod}`,
          {},
          userId,
        ),
        api<{ userId: string; quests: QuestView[] }>("/api/quests/active", {}, userId),
      ]);
      setVaults(vaultData.vaults);
      setSummary(summaryData);
      setSwaps(swapData.history);
      setLeaderboardRows(leaderboardData.rows);
      setQuests(questData.quests);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [leaderboardPeriod, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
          }
        }
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" },
    );
    const nodes = Array.from(document.querySelectorAll("[data-reveal]"));
    for (const node of nodes) {
      observer.observe(node);
    }
    return () => observer.disconnect();
  }, []);

  const run = useCallback(
    async (label: string, task: () => Promise<unknown>) => {
      setBusy(true);
      try {
        const result = await task();
        const message = typeof result === "string" ? result : null;
        setStatus(message ?? `${label} completed.`);
        await refresh();
      } catch (error) {
        setStatus(error instanceof Error ? error.message : `${label} failed.`);
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const submitTxPayload = useCallback(
    async (txPayload?: TxPayload) => {
      if (!txPayload || txPayload.mode !== "onchain" || txPayload.steps.length === 0) {
        return txPayload?.note;
      }
      if (!walletExecutor) {
        throw new Error("Connect wallet with Privy before submitting onchain transactions.");
      }
      const hashes = await walletExecutor(txPayload);
      const lastHash = hashes.at(-1);
      if (!lastHash) {
        return "Transaction flow completed.";
      }
      return `Onchain tx sent: ${lastHash.slice(0, 12)}...`;
    },
    [walletExecutor],
  );
  const handleDeposit = useCallback(
    (vaultId: string) => {
      void run("Deposit", async () => {
        const response = await api<MutationResponse>(
          "/api/vaults/deposit",
          {
            method: "POST",
            body: JSON.stringify({
              vaultId,
              amount: Number(vaultInputs[vaultId] ?? "0"),
            }),
          },
          userId,
        );
        return submitTxPayload(response.txPayload);
      });
    },
    [run, submitTxPayload, userId, vaultInputs],
  );

  const handleWithdraw = useCallback(
    (vaultId: string) => {
      void run("Withdraw", async () => {
        const response = await api<MutationResponse>(
          "/api/vaults/withdraw",
          {
            method: "POST",
            body: JSON.stringify({
              vaultId,
              amount: Number(vaultInputs[vaultId] ?? "0"),
            }),
          },
          userId,
        );
        return submitTxPayload(response.txPayload);
      });
    },
    [run, submitTxPayload, userId, vaultInputs],
  );

  const handleSwap = useCallback(() => {
    void run("Swap", async () => {
      const from = swapDirection === "USDC_EURC" ? "USDC" : "EURC";
      const to = swapDirection === "USDC_EURC" ? "EURC" : "USDC";
      const amount = Number(swapAmount);
      const query = new URLSearchParams({
        from,
        to,
        amount: amount.toString(),
      }).toString();
      const swapQuote = await api<SwapQuoteView>(`/api/swap/quote?${query}`, {}, userId);
      const body: Record<string, unknown> = {
        from,
        to,
        amount,
        slippageBps: 30,
      };
      if (swapQuote.mode === "onchain" && swapQuote.quote) {
        body.quote = swapQuote.quote;
      }
      const response = await api<MutationResponse>(
        "/api/swap/execute",
        {
          method: "POST",
          body: JSON.stringify(body),
        },
        userId,
      );
      const txStatus = await submitTxPayload(response.txPayload);
      if (swapQuote.warning) {
        return txStatus ? `${txStatus} ${swapQuote.warning}` : swapQuote.warning;
      }
      return txStatus;
    });
  }, [run, submitTxPayload, swapAmount, swapDirection, userId]);

  const handleTask = useCallback(
    (taskKey: string, label: string) => {
      void run(label, () =>
        api(
          "/api/points/event",
          {
            method: "POST",
            body: JSON.stringify({ taskKey }),
          },
          userId,
        ),
      );
    },
    [run, userId],
  );

  const handleApplyReferral = useCallback(() => {
    void run("Apply referral", () =>
      api(
        "/api/referrals/apply",
        {
          method: "POST",
          body: JSON.stringify({ code: referralCodeInput }),
        },
        userId,
      ),
    );
  }, [referralCodeInput, run, userId]);

  const handleClaimNft = useCallback(
    (tier: NftTier) => {
      void run(`Claim ${tier}`, async () => {
        const response = await api<MutationResponse>(
          "/api/nft/claim",
          {
            method: "POST",
            body: JSON.stringify({ tier }),
          },
          userId,
        );
        return submitTxPayload(response.txPayload);
      });
    },
    [run, submitTxPayload, userId],
  );

  const handleCompleteQuest = useCallback(
    (questId: string) => {
      void run("Complete quest", () =>
        api(
          "/api/quests/complete",
          {
            method: "POST",
            body: JSON.stringify({ questId }),
          },
          userId,
        ),
      );
    },
    [run, userId],
  );

  const milestoneProgress = useMemo(() => {
    const swapsCount = summary?.nft.swaps ?? 0;
    return [`${swapsCount}/25`, `${swapsCount}/50`, `${swapsCount}/100`, `${swapsCount}/250`];
  }, [summary?.nft.swaps]);

  const activeNav = navItems.find((item) => item.view === currentView) ?? navItems[0];
  const commandDeckItems = navItems.filter((item) => item.view !== "overview");

  const renderVaultPanel = ({ limit }: { limit?: number } = {}) => {
    const rows = typeof limit === "number" ? vaults.slice(0, limit) : vaults;
    return (
      <Panel title="Yield Vaults" subtitle="Estimated APY model, testnet execution rails.">
        {loading && <p className="text-sm text-white/66">Loading vault rails...</p>}
        <div className="grid gap-4">
          {rows.map((vault) => (
            <article
              key={vault.id}
              className="rounded-md border border-white/14 bg-black/35 p-4 shadow-[0_20px_50px_-36px_rgba(8,14,26,0.6)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-lg font-semibold text-white">{vault.name}</h3>
                <span
                  className={cn(
                    "rounded-sm px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em]",
                    vault.risk === "aggressive"
                      ? "bg-lumma-alert/18 text-white"
                      : vault.risk === "balanced"
                        ? "bg-lumma-sky/22 text-white"
                        : "bg-lumma-lime/32 text-white",
                  )}
                >
                  {vault.risk}
                </span>
              </div>
              <p className="mt-1 text-sm text-white/66">
                {vault.estimatedApyLabel}: {vault.estimatedApy}% | TVL ${vault.tvlUsd.toLocaleString()} | Cap ${vault.txCapUsd.toLocaleString()}
              </p>
              <p className="mt-2 text-sm font-medium text-white">
                Balance: ${vault.position.principalUsd.toFixed(2)} | Earned: ${vault.position.earnedUsd.toFixed(2)}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min="1"
                  placeholder="Amount"
                  value={vaultInputs[vault.id] ?? ""}
                  onChange={(event) =>
                    setVaultInputs((current) => ({
                      ...current,
                      [vault.id]: event.target.value,
                    }))
                  }
                  className="w-32 rounded-sm border border-white/20 bg-black/45 px-2.5 py-1.5 text-sm text-white"
                />
                <button
                  disabled={busy || vault.paused}
                  onClick={() => handleDeposit(vault.id)}
                  className="rounded-sm border border-lumma-sky/55 bg-lumma-sky/12 px-3 py-1.5 text-sm font-semibold text-lumma-sky transition hover:-translate-y-0.5 disabled:opacity-60"
                >
                  Deposit
                </button>
                <button
                  disabled={busy}
                  onClick={() => handleWithdraw(vault.id)}
                  className="rounded-sm border border-white/28 bg-black/45 px-3 py-1.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:opacity-60"
                >
                  Withdraw
                </button>
              </div>
            </article>
          ))}
          {!rows.length && !loading && <EmptyState label="No vaults found for this user yet." />}
        </div>
        {typeof limit === "number" && vaults.length > limit && (
          <div className="mt-4">
            <Link
              href="/app/vaults"
              className="inline-flex items-center gap-2 rounded-sm border border-white/24 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-white/8"
            >
              Open Full Vault Deck
            </Link>
          </div>
        )}
      </Panel>
    );
  };

  const renderSwapPanel = ({ historyLimit }: { historyLimit?: number } = {}) => {
    const rows = typeof historyLimit === "number" ? swaps.slice(0, historyLimit) : swaps;
    return (
      <Panel title="Swap Engine" subtitle="USDC <-> EURC with milestone progression.">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSwapDirection("USDC_EURC")}
            className={cn(
              "rounded-sm px-3 py-1.5 text-sm font-semibold",
              swapDirection === "USDC_EURC"
                ? "border border-lumma-sky/56 bg-lumma-sky/14 text-lumma-sky"
                : "border border-white/28 bg-black/45 text-white",
            )}
          >
            USDC to EURC
          </button>
          <button
            onClick={() => setSwapDirection("EURC_USDC")}
            className={cn(
              "rounded-sm px-3 py-1.5 text-sm font-semibold",
              swapDirection === "EURC_USDC"
                ? "border border-lumma-sky/56 bg-lumma-sky/14 text-lumma-sky"
                : "border border-white/28 bg-black/45 text-white",
            )}
          >
            EURC to USDC
          </button>
          <input
            type="number"
            min="1"
            value={swapAmount}
            onChange={(event) => setSwapAmount(event.target.value)}
            className="w-32 rounded-sm border border-white/20 bg-black/45 px-2.5 py-1.5 text-sm text-white"
          />
          <button
            disabled={busy}
            onClick={handleSwap}
            className="rounded-sm border border-lumma-sky/55 bg-lumma-sky/12 px-3 py-1.5 text-sm font-semibold text-lumma-sky transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            Execute Swap
          </button>
        </div>
        <p className="mt-2 text-xs text-white/66">Swap milestones: {milestoneProgress.join(" | ")}</p>
        <div className="mt-4 space-y-2">
          {rows.map((swap) => (
            <div
              key={swap.id}
              className="rounded-sm border border-white/12 bg-black/32 px-3 py-2 text-sm text-white"
            >
              {swap.from} to {swap.to} | ${swap.amount.toFixed(2)} | {new Date(swap.createdAt).toLocaleString()}
            </div>
          ))}
          {!rows.length && <EmptyState label="No swaps recorded yet." />}
        </div>
        {typeof historyLimit === "number" && swaps.length > historyLimit && (
          <div className="mt-4">
            <Link
              href="/app/swap"
              className="inline-flex items-center gap-2 rounded-sm border border-white/24 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-white/8"
            >
              Open Full Swap Log
            </Link>
          </div>
        )}
      </Panel>
    );
  };

  const renderTasksPanel = () => (
    <Panel title="Tasks + Points" subtitle="Progressive incentives across daily, social, and activity loops.">
      <div className="grid gap-3 sm:grid-cols-2">
        <MetricCard
          icon={<Gift size={18} />}
          label="Settled"
          value={summary?.summary.user.pointsSettled ?? 0}
          pulse="lime"
        />
        <MetricCard
          icon={<Sparkles size={18} />}
          label="Pending"
          value={summary?.summary.user.pointsPending ?? 0}
          pulse="sky"
        />
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {taskDefinitions.map((task) => (
          <button
            key={task.key}
            disabled={busy}
            onClick={() => handleTask(task.key, task.label)}
            className="flex items-center justify-between rounded-sm border border-white/16 bg-black/34 px-3 py-2 text-left text-sm text-white transition hover:-translate-y-0.5 hover:border-lumma-sky/65 disabled:opacity-60"
          >
            <span>{task.label}</span>
            <span className="font-semibold">+{task.points}</span>
          </button>
        ))}
      </div>
    </Panel>
  );
  const renderReferralsPanel = () => (
    <Panel title="Referral Engine" subtitle="Permanent point share with anti-abuse activation controls.">
      <p className="text-sm text-white/80">
        Your code: <span className="font-semibold text-white">{summary?.referrals.referralCode ?? "..."}</span>
      </p>
      <p className="mt-1 text-sm text-white/66">
        Invites {summary?.referrals.totalInvites ?? 0} | Active {summary?.referrals.activeInvites ?? 0} | Rewards {summary?.referrals.rewardsEarned ?? 0}
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={referralCodeInput}
          onChange={(event) => setReferralCodeInput(event.target.value.toUpperCase())}
          placeholder="Enter referral code"
          className="w-full rounded-sm border border-white/20 bg-black/45 px-3 py-2 text-sm text-white"
        />
        <button
          disabled={busy}
          onClick={handleApplyReferral}
          className="rounded-sm border border-lumma-sky/55 bg-lumma-sky/12 px-4 py-2 text-sm font-semibold text-lumma-sky transition hover:-translate-y-0.5 disabled:opacity-60"
        >
          Apply
        </button>
      </div>
    </Panel>
  );

  const renderNftsPanel = () => (
    <Panel title="NFT Milestones" subtitle="Claim tiers as swap counts unlock each level.">
      <p className="text-sm text-white/72">
        Eligible: {(summary?.nft.eligible ?? []).join(", ") || "none"} | Claimed: {(summary?.nft.claimed ?? []).join(", ") || "none"}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        {nftTiers.map((tier) => (
          <button
            key={tier}
            disabled={busy}
            onClick={() => handleClaimNft(tier)}
            className="rounded-sm border border-white/24 bg-black/34 px-3 py-2 text-sm font-semibold capitalize text-white transition hover:-translate-y-0.5 hover:border-lumma-lime/60 disabled:opacity-60"
          >
            Claim {tier}
          </button>
        ))}
      </div>
    </Panel>
  );

  const renderQuestsPanel = () => (
    <Panel title="Yield Quests" subtitle="Mission chains linking onchain activity and social proofs.">
      <div className="space-y-3">
        {quests.map((quest) => (
          <article
            key={quest.id}
            className="rounded-sm border border-white/16 bg-black/35 p-3 shadow-[0_20px_44px_-36px_rgba(8,16,30,0.62)]"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-white">{quest.name}</p>
                <p className="text-xs text-white/62">+{quest.points} points | scarcity {quest.scarcity}</p>
              </div>
              <button
                disabled={busy || quest.status === "completed"}
                onClick={() => handleCompleteQuest(quest.id)}
                className="rounded-sm border border-lumma-sky/55 bg-lumma-sky/12 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-lumma-sky transition hover:-translate-y-0.5 disabled:opacity-50"
              >
                {quest.status === "completed" ? "Done" : "Complete"}
              </button>
            </div>
            <ul className="mt-2 space-y-1 text-xs text-white/72">
              {quest.tasks.map((task) => (
                <li key={task.id}>
                  {task.label} ({task.target})
                </li>
              ))}
            </ul>
          </article>
        ))}
        {!quests.length && <EmptyState label="No active quests this week." />}
      </div>
    </Panel>
  );

  const renderLeaderboardPanel = () => (
    <Panel title="Leaderboard" subtitle="Top users across weekly, monthly, and all-time windows.">
      <div className="mb-3 flex items-center gap-2">
        {(["weekly", "monthly", "all_time"] as const).map((period) => (
          <button
            key={period}
            onClick={() => setLeaderboardPeriod(period)}
            className={cn(
              "rounded-sm px-3 py-1.5 text-sm font-semibold capitalize",
              leaderboardPeriod === period
                ? "border border-lumma-sky/56 bg-lumma-sky/14 text-lumma-sky"
                : "border border-white/24 bg-black/40 text-white",
            )}
          >
            {period.replace("_", " ")}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-sm border border-white/14 bg-black/36 p-2">
        <table className="min-w-full border-collapse text-sm text-white">
          <thead>
            <tr className="border-b border-white/20 text-left text-xs uppercase tracking-[0.14em] text-white/66">
              <th className="py-2 pr-2">Rank</th>
              <th className="py-2 pr-2">User</th>
              <th className="py-2">Points</th>
            </tr>
          </thead>
          <tbody>
            {leaderboardRows.map((row) => (
              <tr key={row.userId} className="border-b border-white/10">
                <td className="py-2 pr-2 font-semibold">{row.rank}</td>
                <td className="py-2 pr-2">{row.userId}</td>
                <td className="py-2">{row.points.toFixed(2)}</td>
              </tr>
            ))}
            {!leaderboardRows.length && (
              <tr>
                <td colSpan={3} className="py-5 text-center text-white/60">
                  No ranking entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );

  return (
    <main className="lumma-noir-app relative min-h-screen overflow-hidden bg-[#04070e] pb-20 text-[#eceef2]">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="lumma-noir-grid" />
      </div>

      <div className="mx-auto max-w-7xl px-5 py-9">
        <header className="lumma-reveal relative overflow-hidden rounded-sm border border-white/16 bg-[#050913] p-6 shadow-[0_34px_80px_-48px_rgba(3,10,20,0.78)]" data-reveal>
          <div className="pointer-events-none absolute inset-0 lumma-scanlines opacity-60" />
          <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <LummaLogo />
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/22 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/82">
                Built on Arc
              </span>
              <a
                href="https://docs.lumma.xyz"
                className="rounded-lg border border-white/25 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white/86 transition hover:bg-white/10"
              >
                Docs
              </a>
            </div>
          </div>

          <p className="mt-5 max-w-4xl text-xl font-semibold leading-tight text-white sm:text-2xl">
            Cockpit rebuilt into a modular command deck. No more one-page overload.
          </p>

          <div className="mt-5 overflow-x-auto pb-1">
            <nav className="flex min-w-max items-center gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.view === currentView;
                return (
                  <Link
                    key={item.view}
                    href={item.href}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-sm px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em] transition",
                      isActive
                        ? "bg-white text-[#050913]"
                        : "border border-white/20 bg-white/5 text-white/85 hover:-translate-y-0.5 hover:border-lumma-sky/60",
                    )}
                  >
                    <Icon size={14} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <article className="lumma-scanline rounded-sm border border-white/18 bg-black/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/64">Active View</p>
              <h1 className="mt-1 font-display text-3xl font-semibold text-white">{activeNav.label}</h1>
              <p className="mt-2 text-sm text-white/72">{activeNav.blurb}</p>
            </article>
            <article className="rounded-sm border border-white/18 bg-black/40 p-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <label className="text-sm text-white">
                  Active User ID
                  <input
                    className="mt-1 w-full rounded-sm border border-white/20 bg-black/45 px-3 py-2 text-white"
                    value={userId}
                    onChange={(event) => setUserId(event.target.value || "demo-user")}
                  />
                </label>
                <button
                  onClick={() => void refresh()}
                  className="h-fit rounded-sm border border-lumma-sky/52 bg-lumma-sky/12 px-4 py-2 text-sm font-semibold text-lumma-sky transition hover:-translate-y-0.5"
                >
                  Refresh
                </button>
              </div>
            </article>
          </div>

          <div id="wallet-section" className="mt-4 scroll-mt-24">
            {privyEnabled ? (
              <PrivyAuth
                onResolvedUserId={setUserId}
                onWalletExecutorReady={(executor) => setWalletExecutor(() => executor)}
              />
            ) : (
              <PrivySetupHint />
            )}
          </div>

          <p className="mt-3 text-xs text-white/62">
            APY values are estimated from the testnet model and update every 15 minutes.
          </p>
          </div>
        </header>

        {status && (
          <div className="lumma-reveal mt-5 rounded-sm border border-white/20 bg-black/45 px-4 py-3 text-sm text-white/86" data-reveal>
            {status}
          </div>
        )}

        <section className="lumma-reveal mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" data-reveal>
          <MetricCard
            icon={<Trophy size={18} />}
            label="Settled Points"
            value={summary?.summary.user.pointsSettled ?? 0}
            pulse="sky"
          />
          <MetricCard
            icon={<Gift size={18} />}
            label="Pending Points"
            value={summary?.summary.user.pointsPending ?? 0}
            pulse="lime"
          />
          <MetricCard
            icon={<ArrowLeftRight size={18} />}
            label="Total Swaps"
            value={summary?.summary.swaps ?? 0}
            pulse="none"
          />
          <MetricCard
            icon={<Vault size={18} />}
            label="Vault Value (USD)"
            value={summary?.summary.totalVaultValue ?? 0}
            pulse="sky"
          />
        </section>

        {summary && summary.summary.user.riskFlag !== "none" && (
          <section className="mt-4 rounded-sm border border-lumma-alert/40 bg-lumma-alert/12 p-3 text-sm text-white">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldAlert size={16} /> Risk posture: {summary.summary.user.riskFlag.toUpperCase()}
            </div>
            <p className="mt-1 text-white/75">
              Strict anti-sybil is active. Abnormal bursts and suspicious referral patterns may delay rewards.
            </p>
          </section>
        )}
        <section className="mt-8 space-y-6">
          {currentView === "overview" && (
            <>
              <Panel title="Command Deck" subtitle="Each system is now isolated in dedicated pages.">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {commandDeckItems.map((item) => (
                    <Link
                      key={item.view}
                      href={item.href}
                      className="group rounded-sm border border-white/16 bg-black/36 p-3 transition hover:-translate-y-1 hover:border-lumma-sky/58"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-white">{item.label}</span>
                        <item.icon size={14} className="text-white/65 transition group-hover:text-white" />
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-white/66">{item.blurb}</p>
                    </Link>
                  ))}
                </div>
              </Panel>

              <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <Panel title="Protocol Pulse" subtitle="Live readouts for your current identity.">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <PulseTile label="Deposits" value={summary?.summary.deposits ?? 0} />
                    <PulseTile label="Referral Invites" value={summary?.referrals.totalInvites ?? 0} />
                    <PulseTile label="Quest Runs" value={quests.length} />
                    <PulseTile label="NFT Swaps Progress" value={summary?.nft.swaps ?? 0} />
                  </div>
                </Panel>
                <Panel title="Quest Feed" subtitle="Quick mission status this week.">
                  <div className="space-y-2">
                    {quests.slice(0, 3).map((quest) => (
                      <div
                        key={quest.id}
                        className="rounded-sm border border-white/14 bg-black/35 px-3 py-2"
                      >
                        <p className="text-sm font-semibold text-white">{quest.name}</p>
                        <p className="text-xs text-white/62">
                          {quest.status === "completed" ? "Completed" : "In progress"} | +{quest.points}
                        </p>
                      </div>
                    ))}
                    {!quests.length && <EmptyState label="No quests available yet." />}
                  </div>
                </Panel>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                {renderVaultPanel({ limit: 2 })}
                {renderSwapPanel({ historyLimit: 4 })}
              </div>
            </>
          )}

          {currentView === "vaults" && renderVaultPanel()}
          {currentView === "swap" && renderSwapPanel()}
          {currentView === "tasks" && renderTasksPanel()}
          {currentView === "leaderboard" && renderLeaderboardPanel()}
          {currentView === "referrals" && renderReferralsPanel()}
          {currentView === "quests" && renderQuestsPanel()}
          {currentView === "nfts" && renderNftsPanel()}
        </section>
      </div>
    </main>
  );
}

function Panel({
  title,
  subtitle,
  children,
  id,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      data-reveal
      className="lumma-reveal relative scroll-mt-24 overflow-hidden rounded-sm border border-white/14 bg-black/38 p-5 shadow-[0_20px_56px_-44px_rgba(4,11,22,0.72)] backdrop-blur"
    >
      <div className="pointer-events-none absolute inset-0 lumma-scanlines opacity-35" />
      <div className="relative">
        <h2 className="font-display text-xl font-semibold text-white">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-white/66">{subtitle}</p>}
        <div className="mt-4">{children}</div>
      </div>
    </section>
  );
}

function PrivySetupHint() {
  return (
    <div className="rounded-sm border border-lumma-alert/35 bg-lumma-alert/12 p-4 text-sm text-white">
      <p className="font-semibold">Privy wallet login is not configured for this deployment.</p>
      <p className="mt-1 text-white/75">
        Add <code>NEXT_PUBLIC_PRIVY_APP_ID</code> in Vercel project envs and redeploy.
      </p>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  pulse,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  pulse: "sky" | "lime" | "none";
}) {
  return (
    <article
      className={cn(
        "rounded-sm border border-white/14 bg-black/36 p-4 backdrop-blur",
        pulse === "sky" && "lumma-pulse-sky",
        pulse === "lime" && "lumma-pulse-lime",
      )}
    >
      <div className="flex items-center gap-2 text-white/74">{icon}</div>
      <p className="mt-2 text-xs uppercase tracking-[0.13em] text-white/58">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value.toLocaleString()}</p>
    </article>
  );
}

function PulseTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm border border-white/14 bg-black/38 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.14em] text-white/58">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value.toLocaleString()}</p>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="text-sm text-white/62">{label}</p>;
}
