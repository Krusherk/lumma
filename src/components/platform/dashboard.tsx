"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Gift, ShieldAlert, Trophy, Vault } from "lucide-react";

import { LummaLogo } from "@/components/brand/lumma-logo";
import { PrivyAuth } from "@/components/platform/privy-auth";
import { taskDefinitions } from "@/lib/tasks";
import { cn } from "@/lib/utils";

type LeaderboardPeriod = "weekly" | "monthly" | "all_time";
type NftTier = "bronze" | "silver" | "gold" | "diamond";

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

async function api<T>(path: string, init: RequestInit = {}, userId: string): Promise<T> {
  const response = await fetch(path, {
    ...init,
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

export function Dashboard() {
  const [userId, setUserId] = useState("demo-user");
  const [vaults, setVaults] = useState<VaultView[]>([]);
  const [summary, setSummary] = useState<AppSummary | null>(null);
  const [swaps, setSwaps] = useState<Array<{ id: string; from: string; to: string; amount: number; createdAt: string }>>([]);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<LeaderboardPeriod>("weekly");
  const [leaderboardRows, setLeaderboardRows] = useState<Array<{ userId: string; points: number; rank: number }>>([]);
  const [quests, setQuests] = useState<QuestView[]>([]);
  const [vaultInputs, setVaultInputs] = useState<Record<string, string>>({});
  const [swapAmount, setSwapAmount] = useState("100");
  const [swapDirection, setSwapDirection] = useState<"USDC_EURC" | "EURC_USDC">("USDC_EURC");
  const [referralCodeInput, setReferralCodeInput] = useState("");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [vaultData, summaryData, swapData, leaderboardData, questData] = await Promise.all([
        api<{ userId: string; vaults: VaultView[] }>("/api/vaults", {}, userId),
        api<AppSummary>("/api/user/summary", {}, userId),
        api<{ userId: string; history: Array<{ id: string; from: string; to: string; amount: number; createdAt: string }> }>("/api/swaps/history", {}, userId),
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

  const run = useCallback(
    async (label: string, task: () => Promise<unknown>) => {
      setBusy(true);
      try {
        await task();
        setStatus(`${label} completed.`);
        await refresh();
      } catch (error) {
        setStatus(error instanceof Error ? error.message : `${label} failed.`);
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const milestoneProgress = useMemo(() => {
    const swapsCount = summary?.nft.swaps ?? 0;
    return [`${swapsCount}/25`, `${swapsCount}/50`, `${swapsCount}/100`, `${swapsCount}/250`];
  }, [summary?.nft.swaps]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_20%_10%,rgba(94,233,255,0.45),transparent_38%),radial-gradient(circle_at_80%_80%,rgba(198,255,92,0.45),transparent_40%),linear-gradient(140deg,#f7f4ea,#eef6f8)] pb-20">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <header className="rounded-3xl border border-lumma-ink/15 bg-white/60 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <LummaLogo />
            <span className="rounded-full border border-lumma-ink/20 bg-lumma-sand px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-lumma-ink">
              Built on Arc
            </span>
          </div>
          <p className="mt-5 max-w-3xl text-xl font-medium leading-tight text-lumma-ink sm:text-2xl">
            Stablecoin utility with game loops. Vault yield, StableFX swaps, points, referrals, and milestone NFTs in one Arc-native cockpit.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <label className="flex flex-col gap-2 text-sm">
              Active User ID
              <input
                className="rounded-xl border border-lumma-ink/20 bg-white px-3 py-2 font-medium text-lumma-ink"
                value={userId}
                onChange={(event) => setUserId(event.target.value || "demo-user")}
              />
            </label>
            <button
              onClick={() => void refresh()}
              className="h-fit rounded-xl bg-lumma-ink px-4 py-2 text-sm font-semibold text-lumma-sand transition hover:opacity-90"
            >
              Refresh
            </button>
          </div>
          {privyEnabled && <div className="mt-4"><PrivyAuth onResolvedUserId={setUserId} /></div>}
          <p className="mt-3 text-xs text-lumma-ink/70">
            APY values are estimated from the testnet model and update every 15 minutes.
          </p>
        </header>

        {status && (
          <div className="mt-5 rounded-2xl border border-lumma-ink/20 bg-white/80 px-4 py-3 text-sm text-lumma-ink">
            {status}
          </div>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard icon={<Trophy size={18} />} label="Settled Points" value={summary?.summary.user.pointsSettled ?? 0} />
          <MetricCard icon={<Gift size={18} />} label="Pending Points" value={summary?.summary.user.pointsPending ?? 0} />
          <MetricCard icon={<ArrowLeftRight size={18} />} label="Total Swaps" value={summary?.summary.swaps ?? 0} />
          <MetricCard icon={<Vault size={18} />} label="Vault Value (USD)" value={summary?.summary.totalVaultValue ?? 0} />
        </section>

        {summary && summary.summary.user.riskFlag !== "none" && (
          <section className="mt-4 rounded-2xl border border-lumma-alert/35 bg-lumma-alert/10 p-3 text-sm text-lumma-ink">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldAlert size={16} /> Risk posture: {summary.summary.user.riskFlag.toUpperCase()}
            </div>
            <p className="mt-1 text-lumma-ink/80">
              Strict anti-sybil is active. Abnormal event bursts and referral patterns may delay or block rewards.
            </p>
          </section>
        )}

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.45fr_1fr]">
          <div className="space-y-6">
            <Panel title="Yield Vaults">
              {loading && <p className="text-sm text-lumma-ink/70">Loading vaults...</p>}
              <div className="grid gap-4">
                {vaults.map((vault) => (
                  <div key={vault.id} className="rounded-2xl border border-lumma-ink/15 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-display text-lg font-semibold text-lumma-ink">{vault.name}</h3>
                      <span
                        className={cn(
                          "rounded-lg px-2 py-1 text-xs font-semibold uppercase tracking-wider",
                          vault.risk === "aggressive"
                            ? "bg-lumma-alert/15 text-lumma-ink"
                            : vault.risk === "balanced"
                              ? "bg-lumma-sky/20 text-lumma-ink"
                              : "bg-lumma-lime/30 text-lumma-ink",
                        )}
                      >
                        {vault.risk}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-lumma-ink/70">
                      {vault.estimatedApyLabel}: {vault.estimatedApy}% | TVL ${vault.tvlUsd.toLocaleString()} | Cap ${vault.txCapUsd.toLocaleString()}
                    </p>
                    <p className="mt-2 text-sm font-medium text-lumma-ink">
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
                        className="w-32 rounded-lg border border-lumma-ink/20 px-2 py-1.5 text-sm"
                      />
                      <button
                        disabled={busy || vault.paused}
                        onClick={() =>
                          void run("Deposit", () =>
                            api(
                              "/api/vaults/deposit",
                              {
                                method: "POST",
                                body: JSON.stringify({
                                  vaultId: vault.id,
                                  amount: Number(vaultInputs[vault.id] ?? "0"),
                                }),
                              },
                              userId,
                            ),
                          )
                        }
                        className="rounded-lg bg-lumma-ink px-3 py-1.5 text-sm font-medium text-lumma-sand disabled:opacity-60"
                      >
                        Deposit
                      </button>
                      <button
                        disabled={busy}
                        onClick={() =>
                          void run("Withdraw", () =>
                            api(
                              "/api/vaults/withdraw",
                              {
                                method: "POST",
                                body: JSON.stringify({
                                  vaultId: vault.id,
                                  amount: Number(vaultInputs[vault.id] ?? "0"),
                                }),
                              },
                              userId,
                            ),
                          )
                        }
                        className="rounded-lg border border-lumma-ink/30 px-3 py-1.5 text-sm font-medium text-lumma-ink disabled:opacity-60"
                      >
                        Withdraw
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Swap Engine (USDC/EURC)">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setSwapDirection("USDC_EURC")}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-medium",
                    swapDirection === "USDC_EURC"
                      ? "bg-lumma-ink text-lumma-sand"
                      : "border border-lumma-ink/20 text-lumma-ink",
                  )}
                >
                  USDC to EURC
                </button>
                <button
                  onClick={() => setSwapDirection("EURC_USDC")}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-medium",
                    swapDirection === "EURC_USDC"
                      ? "bg-lumma-ink text-lumma-sand"
                      : "border border-lumma-ink/20 text-lumma-ink",
                  )}
                >
                  EURC to USDC
                </button>
                <input
                  type="number"
                  min="1"
                  value={swapAmount}
                  onChange={(event) => setSwapAmount(event.target.value)}
                  className="w-32 rounded-lg border border-lumma-ink/20 px-2 py-1.5 text-sm"
                />
                <button
                  disabled={busy}
                  onClick={() =>
                    void run("Swap", () =>
                      api(
                        "/api/swap/execute",
                        {
                          method: "POST",
                          body: JSON.stringify({
                            from: swapDirection === "USDC_EURC" ? "USDC" : "EURC",
                            to: swapDirection === "USDC_EURC" ? "EURC" : "USDC",
                            amount: Number(swapAmount),
                            slippageBps: 30,
                          }),
                        },
                        userId,
                      ),
                    )
                  }
                  className="rounded-lg bg-lumma-ink px-3 py-1.5 text-sm font-medium text-lumma-sand disabled:opacity-60"
                >
                  Execute Swap
                </button>
              </div>
              <p className="mt-2 text-xs text-lumma-ink/70">
                Swap milestones: {milestoneProgress.join(" | ")}
              </p>
              <div className="mt-4 space-y-2">
                {swaps.slice(0, 6).map((swap) => (
                  <div key={swap.id} className="rounded-lg border border-lumma-ink/10 bg-lumma-sand/60 px-3 py-2 text-sm text-lumma-ink">
                    {swap.from} to {swap.to} | ${swap.amount.toFixed(2)} | {new Date(swap.createdAt).toLocaleString()}
                  </div>
                ))}
                {!swaps.length && <p className="text-sm text-lumma-ink/60">No swaps yet.</p>}
              </div>
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel title="Points Tasks">
              <div className="grid gap-2">
                {taskDefinitions.map((task) => (
                  <button
                    key={task.key}
                    disabled={busy}
                    onClick={() =>
                      void run(task.label, () =>
                        api(
                          "/api/points/event",
                          {
                            method: "POST",
                            body: JSON.stringify({
                              taskKey: task.key,
                            }),
                          },
                          userId,
                        ),
                      )
                    }
                    className="flex items-center justify-between rounded-lg border border-lumma-ink/15 bg-white px-3 py-2 text-left text-sm text-lumma-ink transition hover:bg-lumma-sand/70 disabled:opacity-60"
                  >
                    <span>{task.label}</span>
                    <span className="font-semibold">+{task.points}</span>
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="Referrals">
              <p className="text-sm text-lumma-ink/80">
                Your code: <span className="font-semibold">{summary?.referrals.referralCode ?? "..."}</span>
              </p>
              <p className="mt-1 text-sm text-lumma-ink/70">
                Invites {summary?.referrals.totalInvites ?? 0} | Active {summary?.referrals.activeInvites ?? 0} | Rewards {summary?.referrals.rewardsEarned ?? 0}
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  value={referralCodeInput}
                  onChange={(event) => setReferralCodeInput(event.target.value.toUpperCase())}
                  placeholder="Enter referral code"
                  className="w-full rounded-lg border border-lumma-ink/20 px-3 py-2 text-sm"
                />
                <button
                  disabled={busy}
                  onClick={() =>
                    void run("Apply referral", () =>
                      api(
                        "/api/referrals/apply",
                        {
                          method: "POST",
                          body: JSON.stringify({ code: referralCodeInput }),
                        },
                        userId,
                      ),
                    )
                  }
                  className="rounded-lg bg-lumma-ink px-3 py-2 text-sm font-semibold text-lumma-sand disabled:opacity-60"
                >
                  Apply
                </button>
              </div>
            </Panel>

            <Panel title="Milestone NFTs">
              <p className="text-sm text-lumma-ink/70">
                Eligible: {(summary?.nft.eligible ?? []).join(", ") || "none"} | Claimed: {(summary?.nft.claimed ?? []).join(", ") || "none"}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {nftTiers.map((tier) => (
                  <button
                    key={tier}
                    disabled={busy}
                    onClick={() =>
                      void run(`Claim ${tier}`, () =>
                        api(
                          "/api/nft/claim",
                          {
                            method: "POST",
                            body: JSON.stringify({ tier }),
                          },
                          userId,
                        ),
                      )
                    }
                    className="rounded-lg border border-lumma-ink/20 bg-white px-3 py-2 text-sm font-medium text-lumma-ink transition hover:bg-lumma-sand/70 disabled:opacity-60"
                  >
                    Claim {tier}
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="Yield Quests">
              <div className="space-y-3">
                {quests.map((quest) => (
                  <div key={quest.id} className="rounded-xl border border-lumma-ink/15 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-lumma-ink">{quest.name}</p>
                        <p className="text-xs text-lumma-ink/60">
                          +{quest.points} points | scarcity {quest.scarcity}
                        </p>
                      </div>
                      <button
                        disabled={busy || quest.status === "completed"}
                        onClick={() =>
                          void run("Complete quest", () =>
                            api(
                              "/api/quests/complete",
                              {
                                method: "POST",
                                body: JSON.stringify({ questId: quest.id }),
                              },
                              userId,
                            ),
                          )
                        }
                        className="rounded-lg bg-lumma-ink px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-lumma-sand disabled:opacity-50"
                      >
                        {quest.status === "completed" ? "Done" : "Complete"}
                      </button>
                    </div>
                    <ul className="mt-2 space-y-1 text-xs text-lumma-ink/75">
                      {quest.tasks.map((task) => (
                        <li key={task.id}>
                          {task.label} ({task.target})
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </section>

        <section className="mt-8">
          <Panel title="Leaderboard">
            <div className="mb-3 flex items-center gap-2">
              {(["weekly", "monthly", "all_time"] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setLeaderboardPeriod(period)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-medium capitalize",
                    leaderboardPeriod === period
                      ? "bg-lumma-ink text-lumma-sand"
                      : "border border-lumma-ink/20 text-lumma-ink",
                  )}
                >
                  {period.replace("_", " ")}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm text-lumma-ink">
                <thead>
                  <tr className="border-b border-lumma-ink/20 text-left text-xs uppercase tracking-wider text-lumma-ink/70">
                    <th className="py-2 pr-2">Rank</th>
                    <th className="py-2 pr-2">User</th>
                    <th className="py-2">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardRows.map((row) => (
                    <tr key={row.userId} className="border-b border-lumma-ink/10">
                      <td className="py-2 pr-2 font-semibold">{row.rank}</td>
                      <td className="py-2 pr-2">{row.userId}</td>
                      <td className="py-2">{row.points.toFixed(2)}</td>
                    </tr>
                  ))}
                  {!leaderboardRows.length && (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-lumma-ink/60">
                        No ranking entries yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </section>
      </div>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-lumma-ink/15 bg-white/70 p-5 shadow-sm backdrop-blur">
      <h2 className="font-display text-xl font-semibold text-lumma-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <article className="rounded-2xl border border-lumma-ink/15 bg-white/70 p-4 backdrop-blur">
      <div className="flex items-center gap-2 text-lumma-ink/75">{icon}</div>
      <p className="mt-2 text-xs uppercase tracking-wider text-lumma-ink/60">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-lumma-ink">{value.toLocaleString()}</p>
    </article>
  );
}
