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
import { useWallets } from "@privy-io/react-auth";
import { motion, Variants } from "framer-motion";

import { LummaLogo } from "@/components/brand/lumma-logo";
import { PrivyAuth } from "@/components/platform/privy-auth";
import { taskDefinitions } from "@/lib/tasks";

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 20 },
  },
};
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

interface CircleSwapState {
  stage?: string;
  tradeId?: string;
  contractTradeId?: string;
  tradeSignatureTypedData?: Record<string, unknown>;
  fundingTypedData?: Record<string, unknown>;
  trade?: Record<string, unknown>;
  status?: string;
  message?: string;
}

interface SwapExecutionResponse extends MutationResponse {
  circle?: CircleSwapState;
}

interface SwapQuoteView {
  from: "USDC" | "EURC";
  to: "USDC" | "EURC";
  amount: number;
  rate: number;
  outAmount: number;
  mode?: "simulation" | "onchain" | "circle";
  warning?: string;
  quote?: {
    minOut: number;
    fee: number;
    expiresAt: number;
    signature: string;
  };
  circleQuoteId?: string;
  circleQuote?: {
    id: string;
    rate: number;
    fromAmount: number;
    toAmount: number;
    feeAmount: number;
    expiresAt: string | null;
    endpoint: string;
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
  const { wallets } = useWallets();
  const primaryWallet = useMemo(() => wallets[0] ?? null, [wallets]);
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

  const signTypedData = useCallback(
    async (typedData: Record<string, unknown>) => {
      if (!primaryWallet) {
        throw new Error("Connect wallet with Privy before signing.");
      }
      const provider = await primaryWallet.getEthereumProvider();
      const signature = await provider.request({
        method: "eth_signTypedData_v4",
        params: [primaryWallet.address, JSON.stringify(typedData)],
      });
      return String(signature);
    },
    [primaryWallet],
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
      if (swapQuote.mode === "circle" && swapQuote.circleQuoteId) {
        if (!primaryWallet?.address) {
          throw new Error("Connect wallet with Privy before running StableFX.");
        }
        setStatus("Preparing Circle StableFX trade...");
        const prepare = await api<SwapExecutionResponse>(
          "/api/swap/execute",
          {
            method: "POST",
            body: JSON.stringify({
              from,
              to,
              amount,
              circle: {
                stage: "trade",
                quoteId: swapQuote.circleQuoteId,
                recipientAddress: primaryWallet.address,
              },
            }),
          },
          userId,
        );
        const tradeTypedData = prepare.circle?.tradeSignatureTypedData;
        if (!tradeTypedData || !prepare.circle?.tradeId) {
          return prepare.circle?.message ?? "Circle trade preparation incomplete.";
        }

        setStatus("Sign trade intent in your wallet...");
        const tradeSignature = await signTypedData(tradeTypedData);
        const tradeSigned = await api<SwapExecutionResponse>(
          "/api/swap/execute",
          {
            method: "POST",
            body: JSON.stringify({
              from,
              to,
              amount,
              circle: {
                stage: "trade_signature",
                tradeId: prepare.circle.tradeId,
                recipientAddress: primaryWallet.address,
                signature: tradeSignature,
                typedData: tradeTypedData,
              },
            }),
          },
          userId,
        );
        const fundingTypedData = tradeSigned.circle?.fundingTypedData;
        if (!fundingTypedData || !tradeSigned.circle?.contractTradeId) {
          return (
            tradeSigned.circle?.message ??
            tradeSigned.circle?.status ??
            "Funding data not ready yet. Retry shortly."
          );
        }

        setStatus("Sign funding permit in your wallet...");
        const fundingSignature = await signTypedData(fundingTypedData);
        const funded = await api<SwapExecutionResponse>(
          "/api/swap/execute",
          {
            method: "POST",
            body: JSON.stringify({
              from,
              to,
              amount,
              circle: {
                stage: "funding_submit",
                tradeId: prepare.circle.tradeId,
                contractTradeId: tradeSigned.circle.contractTradeId,
                signature: fundingSignature,
                typedData: fundingTypedData,
                rate: swapQuote.rate,
                outAmount: swapQuote.outAmount,
              },
            }),
          },
          userId,
        );
        return funded.txPayload?.note ?? "Circle StableFX funding submitted.";
      }

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
  }, [run, submitTxPayload, swapAmount, swapDirection, userId, primaryWallet, signTypedData]);

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
        {loading && <p className="text-sm text-[var(--lumma-fg)]/60">Loading vault rails...</p>}
        <div className="grid gap-4">
          {rows.map((vault) => (
            <article
              key={vault.id}
              className="rounded-[16px] border border-[var(--lumma-border)] bg-[var(--lumma-fg)]/[0.02] p-4 shadow-sm backdrop-blur-md"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-lg font-semibold text-[var(--lumma-fg)]">{vault.name}</h3>
                <span
                  className={cn(
                    "rounded-[6px] px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em]",
                    vault.risk === "aggressive"
                      ? "bg-[var(--lumma-alert)]/10 text-[var(--lumma-alert)]"
                      : vault.risk === "balanced"
                        ? "bg-[var(--lumma-sky)]/10 text-[var(--lumma-sky)]"
                        : "bg-[var(--lumma-lime)]/10 text-[var(--lumma-lime)]",
                  )}
                >
                  {vault.risk}
                </span>
              </div>
              <p className="mt-1 text-sm text-[var(--lumma-fg)]/60">
                {vault.estimatedApyLabel}: {vault.estimatedApy}% | TVL ${vault.tvlUsd.toLocaleString()} | Cap ${vault.txCapUsd.toLocaleString()}
              </p>
              <p className="mt-2 text-sm font-medium text-[var(--lumma-fg)]">
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
                  className="w-32 rounded-md border border-[var(--lumma-border)] bg-[var(--lumma-bg)] px-2.5 py-1.5 text-sm text-[var(--lumma-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--lumma-sky)]/50 focus:border-transparent transition-all"
                />
                <button
                  disabled={busy || vault.paused}
                  onClick={() => handleDeposit(vault.id)}
                  className="rounded-md border border-[var(--lumma-sky)]/50 bg-[var(--lumma-sky)]/10 px-3 py-1.5 text-sm font-semibold text-[var(--lumma-sky)] transition hover:bg-[var(--lumma-sky)]/20 disabled:opacity-50"
                >
                  Deposit
                </button>
                <button
                  disabled={busy}
                  onClick={() => handleWithdraw(vault.id)}
                  className="rounded-md border border-[var(--lumma-border)] bg-[var(--lumma-bg)]/50 px-3 py-1.5 text-sm font-semibold text-[var(--lumma-fg)] transition hover:bg-[var(--lumma-fg)]/5 disabled:opacity-50"
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
              className="inline-flex items-center gap-2 rounded-md border border-[var(--lumma-border)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--lumma-fg)] transition hover:bg-[var(--lumma-fg)]/5"
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
              "rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
              swapDirection === "USDC_EURC"
                ? "border border-[var(--lumma-sky)]/50 bg-[var(--lumma-sky)]/10 text-[var(--lumma-sky)]"
                : "border border-[var(--lumma-border)] bg-[var(--lumma-bg)]/50 text-[var(--lumma-fg)] hover:bg-[var(--lumma-fg)]/5",
            )}
          >
            USDC to EURC
          </button>
          <button
            onClick={() => setSwapDirection("EURC_USDC")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
              swapDirection === "EURC_USDC"
                ? "border border-[var(--lumma-sky)]/50 bg-[var(--lumma-sky)]/10 text-[var(--lumma-sky)]"
                : "border border-[var(--lumma-border)] bg-[var(--lumma-bg)]/50 text-[var(--lumma-fg)] hover:bg-[var(--lumma-fg)]/5",
            )}
          >
            EURC to USDC
          </button>
          <input
            type="number"
            min="1"
            value={swapAmount}
            onChange={(event) => setSwapAmount(event.target.value)}
            className="w-32 rounded-md border border-[var(--lumma-border)] bg-[var(--lumma-bg)] px-2.5 py-1.5 text-sm text-[var(--lumma-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--lumma-sky)]/50 focus:border-transparent transition-all"
          />
          <button
            disabled={busy}
            onClick={handleSwap}
            className="rounded-md border border-[var(--lumma-sky)]/50 bg-[var(--lumma-sky)]/10 px-3 py-1.5 text-sm font-semibold text-[var(--lumma-sky)] transition hover:bg-[var(--lumma-sky)]/20 disabled:opacity-50"
          >
            Execute Swap
          </button>
        </div>
        <p className="mt-2 text-xs text-[var(--lumma-fg)]/60">Swap milestones: {milestoneProgress.join(" | ")}</p>
        <div className="mt-4 space-y-2">
          {rows.map((swap) => (
            <div
              key={swap.id}
              className="rounded-md border border-[var(--lumma-border)] bg-[var(--lumma-fg)]/[0.02] px-3 py-2 text-sm text-[var(--lumma-fg)]"
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
              className="inline-flex items-center gap-2 rounded-md border border-[var(--lumma-border)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--lumma-fg)] transition hover:bg-[var(--lumma-fg)]/5"
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
            className="flex items-center justify-between rounded-md border border-[var(--lumma-border)] bg-[var(--lumma-fg)]/[0.02] px-3 py-2 text-left text-sm text-[var(--lumma-fg)] transition hover:-translate-y-0.5 hover:border-[var(--lumma-sky)]/50 hover:bg-[var(--lumma-fg)]/5 disabled:opacity-50"
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
      <p className="text-sm text-[var(--lumma-fg)]/80">
        Your code: <span className="font-semibold text-[var(--lumma-fg)]">{summary?.referrals.referralCode ?? "..."}</span>
      </p>
      <p className="mt-1 text-sm text-[var(--lumma-fg)]/60">
        Invites {summary?.referrals.totalInvites ?? 0} | Active {summary?.referrals.activeInvites ?? 0} | Rewards {summary?.referrals.rewardsEarned ?? 0}
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={referralCodeInput}
          onChange={(event) => setReferralCodeInput(event.target.value.toUpperCase())}
          placeholder="Enter referral code"
          className="w-full rounded-md border border-[var(--lumma-border)] bg-[var(--lumma-bg)] px-3 py-2 text-sm text-[var(--lumma-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--lumma-sky)]/50 focus:border-transparent transition-all"
        />
        <button
          disabled={busy}
          onClick={handleApplyReferral}
          className="rounded-md border border-[var(--lumma-sky)]/50 bg-[var(--lumma-sky)]/10 px-4 py-2 text-sm font-semibold text-[var(--lumma-sky)] transition hover:bg-[var(--lumma-sky)]/20 disabled:opacity-50"
        >
          Apply
        </button>
      </div>
    </Panel>
  );

  const renderNftsPanel = () => (
    <Panel title="NFT Milestones" subtitle="Claim tiers as swap counts unlock each level.">
      <p className="text-sm text-[var(--lumma-fg)]/70">
        Eligible: {(summary?.nft.eligible ?? []).join(", ") || "none"} | Claimed: {(summary?.nft.claimed ?? []).join(", ") || "none"}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        {nftTiers.map((tier) => (
          <button
            key={tier}
            disabled={busy}
            onClick={() => handleClaimNft(tier)}
            className="rounded-md border border-[var(--lumma-border)] bg-[var(--lumma-fg)]/[0.02] px-3 py-2 text-sm font-semibold capitalize text-[var(--lumma-fg)] transition hover:-translate-y-0.5 hover:border-[var(--lumma-lime)]/50 hover:bg-[var(--lumma-fg)]/5 disabled:opacity-50"
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
            className="rounded-[16px] border border-[var(--lumma-border)] bg-[var(--lumma-fg)]/[0.02] p-4 shadow-sm backdrop-blur-md"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-[var(--lumma-fg)]">{quest.name}</p>
                <p className="text-[13px] text-[var(--lumma-fg)]/60">+{quest.points} points | scarcity {quest.scarcity}</p>
              </div>
              <button
                disabled={busy || quest.status === "completed"}
                onClick={() => handleCompleteQuest(quest.id)}
                className="rounded-md border border-[var(--lumma-sky)]/50 bg-[var(--lumma-sky)]/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--lumma-sky)] transition hover:bg-[var(--lumma-sky)]/20 disabled:opacity-50"
              >
                {quest.status === "completed" ? "Done" : "Complete"}
              </button>
            </div>
            <ul className="mt-3 space-y-1 text-[13px] text-[var(--lumma-fg)]/70">
              {quest.tasks.map((task) => (
                <li key={task.id} className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-[var(--lumma-fg)]/30" />
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
              "rounded-md px-3 py-1.5 text-sm font-semibold capitalize transition-colors",
              leaderboardPeriod === period
                ? "border border-[var(--lumma-sky)]/50 bg-[var(--lumma-sky)]/10 text-[var(--lumma-sky)]"
                : "border border-[var(--lumma-border)] bg-[var(--lumma-bg)]/50 text-[var(--lumma-fg)] hover:bg-[var(--lumma-fg)]/5",
            )}
          >
            {period.replace("_", " ")}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-[16px] border border-[var(--lumma-border)] bg-[var(--lumma-fg)]/[0.02] p-2 backdrop-blur-md">
        <table className="min-w-full border-collapse text-sm text-[var(--lumma-fg)]">
          <thead>
            <tr className="border-b border-[var(--lumma-border)] text-left text-[11px] uppercase tracking-[0.14em] text-[var(--lumma-fg)]/60">
              <th className="py-2 pl-2 pr-2">Rank</th>
              <th className="py-2 pr-2">User</th>
              <th className="py-2">Points</th>
            </tr>
          </thead>
          <tbody>
            {leaderboardRows.map((row) => (
              <tr key={row.userId} className="border-b border-[var(--lumma-border)]/50 hover:bg-[var(--lumma-fg)]/[0.02] transition-colors">
                <td className="py-2 pl-2 pr-2 font-semibold">{row.rank}</td>
                <td className="py-2 pr-2 font-mono text-[13px]">{row.userId}</td>
                <td className="py-2 tabular-nums">{row.points.toFixed(2)}</td>
              </tr>
            ))}
            {!leaderboardRows.length && (
              <tr>
                <td colSpan={3} className="py-5 text-center text-[var(--lumma-fg)]/50">
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
    <main className="lumma-systems-root relative min-h-screen overflow-x-hidden bg-[#131313] pb-20 text-[#e5e2e1]">
      <div className="lumma-systems-supernova fixed inset-0 z-0 opacity-40 grayscale" />
      <div className="lumma-systems-grid-overlay fixed inset-0 z-10 pointer-events-none" />
      <div className="lumma-systems-vertical-text fixed left-8 top-32 z-20 hidden text-[9px] uppercase tracking-[0.4em] text-[#919191]/50 lg:block">
        TESTNET_MODE: MISSION_CONTROL
      </div>
      <div className="lumma-systems-vertical-text fixed bottom-32 right-8 z-20 hidden text-[9px] uppercase tracking-[0.4em] text-[#919191]/50 lg:block">
        ROUTE_SCOPE: /APP/*
      </div>

      <header className="fixed top-0 z-50 flex h-20 w-full items-center justify-between border-b border-white/10 bg-[#131313]/90 px-8 backdrop-blur-xl md:px-12">
        <div className="font-display text-xl font-black uppercase tracking-tight text-white md:text-2xl">
          LUMMA//SYSTEMS
        </div>
        <nav className="hidden gap-10 font-display text-[11px] font-bold uppercase tracking-widest md:flex">
          <Link className="border-b border-white pb-1 text-white transition-all hover:opacity-70" href="/app">
            TESTNET_APP
          </Link>
          <Link className="text-[#919191] transition-all hover:text-white" href="/docs">
            DOCS
          </Link>
          <Link className="text-[#919191] transition-all hover:text-white" href="/">
            LANDING
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <div className="hidden gap-4 sm:flex">
            <span className="material-symbols-outlined text-xl text-white/50">sensors</span>
            <span className="material-symbols-outlined text-xl text-white/50">barcode_scanner</span>
          </div>
          {privyEnabled ? (
            <PrivyAuth
              onResolvedUserId={setUserId}
              onWalletExecutorReady={(executor) => setWalletExecutor(() => executor)}
            />
          ) : (
            <PrivySetupBadge />
          )}
        </div>
      </header>

      <div className="relative z-30 mx-auto max-w-7xl px-4 pb-8 pt-24 sm:px-6">
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-[32px] border border-[var(--lumma-border)] bg-[var(--lumma-bg)] p-6 sm:p-10 lumma-glass-panel"
        >
          <div className="pointer-events-none absolute inset-0 lumma-scanlines opacity-40 mix-blend-overlay" />
          <div className="relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <LummaLogo />
              <div className="flex flex-wrap items-center justify-end gap-3">
                <span className="rounded-full border border-[var(--lumma-border)] bg-[var(--lumma-fg)]/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--lumma-fg)]/80 backdrop-blur-md">
                  Built on Arc
                </span>
                <a
                  href="https://docs.lumma.xyz"
                  className="rounded-full border border-[var(--lumma-border)] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--lumma-fg)]/80 transition hover:bg-[var(--lumma-fg)]/10"
                >
                  Docs
                </a>
              </div>
            </div>

            <p className="mt-8 max-w-3xl font-display text-2xl font-semibold leading-tight text-[var(--lumma-fg)] sm:text-3xl tracking-tight">
              Lumma testnet command deck for vaults, swaps, points, quests, referrals, and NFT rewards.
            </p>

            <div className="mt-8 overflow-x-auto pb-2 scrollbar-hide">
              <nav className="flex min-w-max items-center gap-2 rounded-2xl border border-[var(--lumma-border)] bg-[var(--lumma-fg)]/5 p-2 backdrop-blur-md w-max">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.view === currentView;
                  return (
                    <Link
                      key={item.view}
                      href={item.href}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-[0.13em] transition-all relative overflow-hidden",
                        isActive
                          ? "bg-[var(--lumma-fg)] text-[var(--lumma-bg)] shadow-md"
                          : "text-[var(--lumma-fg)]/70 hover:text-[var(--lumma-fg)] hover:bg-[var(--lumma-fg)]/10",
                      )}
                    >
                      <Icon size={14} className={isActive ? "opacity-100" : "opacity-70"} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <article className="relative overflow-hidden rounded-[24px] border border-[var(--lumma-border)] bg-[var(--lumma-fg)]/5 p-6 backdrop-blur-md transition hover:bg-[var(--lumma-fg)]/[0.08]">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--lumma-fg)]/[0.05] to-transparent opacity-0 transition-opacity hover:opacity-100" />
                <p className="relative z-10 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--lumma-sky)]">Active View</p>
                <h1 className="relative z-10 mt-2 font-display text-3xl font-semibold text-[var(--lumma-fg)] group-hover:text-[var(--lumma-sky)] transition-colors">{activeNav.label}</h1>
                <p className="relative z-10 mt-2 text-[15px] leading-relaxed text-[var(--lumma-fg)]/70">{activeNav.blurb}</p>
              </article>
              <article className="rounded-[24px] border border-[var(--lumma-border)] bg-[var(--lumma-bg)]/80 p-6 backdrop-blur-md shadow-sm">
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <label className="text-sm font-medium text-[var(--lumma-fg)]">
                    Active User ID
                    <input
                      className="mt-2 w-full rounded-xl border border-[var(--lumma-border)] bg-[var(--lumma-fg)]/5 px-4 py-2.5 text-[var(--lumma-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--lumma-sky)]/50 focus:border-transparent transition-all disabled:opacity-50"
                      value={userId}
                      onChange={(event) => setUserId(event.target.value || "demo-user")}
                      disabled={privyEnabled}
                    />
                  </label>
                  <button
                    onClick={() => void refresh()}
                    className="h-fit rounded-xl border border-[var(--lumma-sky)]/50 bg-[var(--lumma-sky)]/10 px-5 py-2.5 text-sm font-semibold text-[var(--lumma-sky)] hover:bg-[var(--lumma-sky)]/20 transition-all hover:scale-[1.02] shadow-[0_0_15px_rgba(14,165,233,0.1)] active:scale-95"
                  >
                    Refresh
                  </button>
                </div>
                {privyEnabled ? (
                  <p className="mt-2 text-xs text-white/62">
                    User ID is synced from your Privy login in the top-right.
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-white/62">Privy disabled. Manual user mode is active.</p>
                )}
              </article>
            </div>

            <p className="mt-3 text-[13px] text-[var(--lumma-fg)]/50">
              Built on Arc testnet with USDC gas. APY values are estimated and refresh every 15 minutes.
            </p>
          </div>
        </motion.header>

        {!privyEnabled && (
          <div className="mt-6">
            <PrivySetupHint />
          </div>
        )}

        {status && (
          <div className="lumma-reveal mt-5 rounded-sm border border-white/20 bg-black/45 px-4 py-3 text-sm text-white/86" data-reveal>
            {status}
          </div>
        )}

        <motion.section
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
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
        </motion.section>

        {summary && summary.summary.user.riskFlag !== "none" && (
          <motion.section variants={fadeUp} className="mt-4 rounded-xl border border-[var(--lumma-alert)]/40 bg-[var(--lumma-alert)]/10 p-4 text-[15px] text-[var(--lumma-fg)] backdrop-blur-md shadow-sm">
            <div className="flex items-center gap-2 font-semibold text-[var(--lumma-alert)]">
              <ShieldAlert size={18} /> Risk posture: {summary.summary.user.riskFlag.toUpperCase()}
            </div>
            <p className="mt-2 text-[14px] text-[var(--lumma-fg)]/70">
              Strict anti-sybil is active. Abnormal bursts and suspicious referral patterns may delay rewards.
            </p>
          </motion.section>
        )}
        <div className="mt-8 space-y-6">
          {currentView === "overview" && (
            <>
              <Panel title="Command Deck" subtitle="Each system is now isolated in dedicated pages.">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {commandDeckItems.map((item) => (
                    <Link
                      key={item.view}
                      href={item.href}
                      className="group rounded-[16px] border border-[var(--lumma-border)] bg-[var(--lumma-fg)]/[0.02] p-4 transition-all hover:-translate-y-1 hover:border-[var(--lumma-sky)]/50 hover:bg-[var(--lumma-fg)]/5 shadow-sm backdrop-blur-md"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[15px] font-semibold text-[var(--lumma-fg)]">{item.label}</span>
                        <item.icon size={16} className="text-[var(--lumma-fg)]/50 transition group-hover:text-[var(--lumma-sky)]" />
                      </div>
                      <p className="mt-2 text-[13px] leading-relaxed text-[var(--lumma-fg)]/60">{item.blurb}</p>
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
                        className="rounded-md border border-[var(--lumma-border)] bg-[var(--lumma-fg)]/[0.02] px-3 py-2"
                      >
                        <p className="text-sm font-semibold text-[var(--lumma-fg)]">{quest.name}</p>
                        <p className="text-xs text-[var(--lumma-fg)]/60">
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
        </div>
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
    <motion.section
      variants={fadeUp}
      id={id}
      className="relative scroll-mt-24 overflow-hidden rounded-[32px] border border-[var(--lumma-border)] bg-[var(--lumma-bg)] p-6 sm:p-10 lumma-glass-panel"
    >
      <div className="pointer-events-none absolute inset-0 lumma-scanlines opacity-20 mix-blend-overlay" />
      <div className="relative z-10">
        <h2 className="font-display text-[clamp(1.5rem,3vw,2rem)] font-semibold text-[var(--lumma-fg)]">{title}</h2>
        {subtitle && <p className="mt-2 text-[15px] text-[var(--lumma-fg)]/60 max-w-2xl">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </motion.section>
  );
}

function PrivySetupHint() {
  return (
    <div className="rounded-md border border-[var(--lumma-alert)]/30 bg-[var(--lumma-alert)]/10 p-4 text-sm text-[var(--lumma-fg)]">
      <p className="font-semibold text-[var(--lumma-alert)]">Privy wallet login is not configured for this deployment.</p>
      <p className="mt-1 text-[var(--lumma-fg)]/70">
        Add <code>NEXT_PUBLIC_PRIVY_APP_ID</code> in Vercel project envs and redeploy.
      </p>
    </div>
  );
}

function PrivySetupBadge() {
  return (
    <span className="rounded-sm border border-lumma-alert/46 bg-lumma-alert/14 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-lumma-alert">
      Privy Off
    </span>
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
    <motion.article
      variants={fadeUp}
      className={cn(
        "relative overflow-hidden rounded-[24px] border border-[var(--lumma-border)] bg-[var(--lumma-bg)]/80 p-5 sm:p-6 backdrop-blur-md shadow-sm transition-transform hover:-translate-y-1 hover:shadow-lg",
        pulse === "sky" && "group",
        pulse === "lime" && "group",
      )}
    >
      {pulse === "sky" && (
        <div className="absolute inset-0 bg-gradient-radial from-[var(--lumma-sky)]/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      )}
      {pulse === "lime" && (
        <div className="absolute inset-0 bg-gradient-radial from-[var(--lumma-lime)]/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      )}
      <div className="relative z-10 flex items-center gap-3 text-[var(--lumma-fg)]/80">
        <div className="rounded-full bg-[var(--lumma-fg)]/5 p-2">{icon}</div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--lumma-fg)]/60">{label}</p>
      </div>
      <p className="relative z-10 mt-4 text-[clamp(1.8rem,4vw,2.5rem)] font-semibold text-[var(--lumma-fg)] tabular-nums leading-none tracking-tight">{value.toLocaleString()}</p>
    </motion.article>
  );
}

function PulseTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[16px] border border-[var(--lumma-border)] bg-[var(--lumma-fg)]/[0.02] px-4 py-3 shadow-sm backdrop-blur-md">
      <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--lumma-fg)]/60">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[var(--lumma-fg)]">{value.toLocaleString()}</p>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="text-[14px] text-[var(--lumma-fg)]/50">{label}</p>;
}
