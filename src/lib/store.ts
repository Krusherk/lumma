import { assessStrictRisk } from "@/lib/anti-sybil";
import { estimateVaultApy, accrueSimpleInterest } from "@/lib/apy";
import { config } from "@/lib/config";
import { getEligibleMilestones, nftBoosts, swapMilestones } from "@/lib/nft";
import { weeklyQuests } from "@/lib/quests";
import { taskByKey } from "@/lib/tasks";
import type {
  AbuseFlag,
  LeaderboardPeriod,
  LeaderboardSnapshot,
  NftClaim,
  NftTier,
  PointEvent,
  QuestRun,
  ReferralLink,
  ReferralReward,
  RiskFlag,
  SwapEvent,
  UserProfile,
  VaultDefinition,
  VaultEvent,
  VaultPosition,
} from "@/lib/types";
import { deterministicNumber, nowIso, round2 } from "@/lib/utils";

interface LummaState {
  users: Map<string, UserProfile>;
  vaults: VaultDefinition[];
  vaultPositions: VaultPosition[];
  vaultEvents: VaultEvent[];
  swapEvents: SwapEvent[];
  pointEvents: PointEvent[];
  referrals: ReferralLink[];
  referralRewards: ReferralReward[];
  questRuns: QuestRun[];
  nftClaims: NftClaim[];
  abuseFlags: AbuseFlag[];
  leaderboardSnapshots: LeaderboardSnapshot[];
  admin: {
    vaultsPaused: boolean;
  };
}

function randomId(prefix: string) {
  const token = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${token}`;
}

function buildReferralCode(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const token = (hash >>> 0).toString(36).toUpperCase().padStart(6, "0").slice(0, 6);
  return `LUM-${token}`;
}

function referralCodeFor(userId: string) {
  return buildReferralCode(`ref:${userId}`);
}

function referralCodeVariant(userId: string, attempt: number) {
  return buildReferralCode(`ref:${userId}:${attempt}`);
}

function generateUniqueReferralCode(userId: string) {
  const taken = new Set(
    Array.from(state.users.values()).map((user) => user.referralCode),
  );
  const candidates = [
    referralCodeFor(userId),
    ...Array.from({ length: 6 }, (_, index) => referralCodeVariant(userId, index + 1)),
  ];
  for (const candidate of candidates) {
    if (!taken.has(candidate)) {
      return candidate;
    }
  }
  let attempt = 0;
  while (attempt < 32) {
    const candidate = buildReferralCode(
      `rnd:${userId}:${attempt}:${Math.random().toString(36).slice(2)}`,
    );
    if (!taken.has(candidate)) {
      return candidate;
    }
    attempt += 1;
  }
  throw new Error("Unable to allocate unique referral code in memory mode.");
}

function initialVaults(): VaultDefinition[] {
  return [
    {
      id: "vault-conservative",
      risk: "conservative",
      name: "Conservative Vault",
      apyMin: 5,
      apyMax: 8,
      tvlUsd: 128000,
      txCapUsd: 25000,
    },
    {
      id: "vault-balanced",
      risk: "balanced",
      name: "Balanced Vault",
      apyMin: 8,
      apyMax: 12,
      tvlUsd: 256000,
      txCapUsd: 25000,
    },
    {
      id: "vault-aggressive",
      risk: "aggressive",
      name: "Aggressive Vault",
      apyMin: 12,
      apyMax: 20,
      tvlUsd: 512000,
      txCapUsd: 25000,
    },
  ];
}

function createState(): LummaState {
  return {
    users: new Map<string, UserProfile>(),
    vaults: initialVaults(),
    vaultPositions: [],
    vaultEvents: [],
    swapEvents: [],
    pointEvents: [],
    referrals: [],
    referralRewards: [],
    questRuns: [],
    nftClaims: [],
    abuseFlags: [],
    leaderboardSnapshots: [],
    admin: {
      vaultsPaused: false,
    },
  };
}

const globalStore = globalThis as typeof globalThis & {
  __lummaState?: LummaState;
};

const state = globalStore.__lummaState ?? createState();
globalStore.__lummaState = state;

export function getOrCreateUser(userId: string, walletAddress?: string) {
  const existing = state.users.get(userId);
  if (existing) {
    if (walletAddress && !existing.walletAddress) {
      existing.walletAddress = walletAddress;
    }
    return existing;
  }
  const user: UserProfile = {
    id: userId,
    createdAt: nowIso(),
    walletAddress,
    referralCode: generateUniqueReferralCode(userId),
    pointsPending: 0,
    pointsSettled: 0,
    riskFlag: "none",
  };
  state.users.set(userId, user);
  return user;
}

function findPosition(userId: string, vaultId: string) {
  return state.vaultPositions.find(
    (position) => position.userId === userId && position.vaultId === vaultId,
  );
}

function settlePendingPointEvents(userId: string) {
  const user = getOrCreateUser(userId);
  const now = Date.now();
  for (const event of state.pointEvents) {
    if (event.userId !== userId || event.status !== "pending" || !event.settlesAt) {
      continue;
    }
    if (new Date(event.settlesAt).getTime() > now) {
      continue;
    }
    event.status = "settled";
    user.pointsPending = Math.max(0, user.pointsPending - event.points);
    user.pointsSettled += event.points;
    processReferralReward(event);
  }
}

function processReferralReward(event: PointEvent) {
  const link = state.referrals.find((item) => item.referredUserId === event.userId);
  if (!link?.rewardsEnabledAt) {
    return;
  }
  const referrer = getOrCreateUser(link.referrerUserId);
  const rewardPoints = round2(event.points * 0.1);
  referrer.pointsSettled += rewardPoints;
  state.referralRewards.push({
    id: randomId("rew"),
    referrerUserId: link.referrerUserId,
    sourceUserId: event.userId,
    sourceEventId: event.id,
    points: rewardPoints,
    createdAt: nowIso(),
  });
}

function updateUserRisk(userId: string, nextRisk: RiskFlag, reasons: string[]) {
  const user = getOrCreateUser(userId);
  user.riskFlag = nextRisk;
  for (const reason of reasons) {
    state.abuseFlags.push({
      id: randomId("abuse"),
      userId,
      signal: reason,
      score: nextRisk === "blocked" ? 80 : 40,
      createdAt: nowIso(),
    });
  }
}

function applyPointBoost(userId: string, points: number) {
  const claimed = state.nftClaims.filter((claim) => claim.userId === userId);
  const tierOrder: Array<Exclude<NftTier, "special">> = ["diamond", "gold", "silver", "bronze"];
  const highest = tierOrder.find((tier) =>
    claimed.some((claim) => claim.tier === tier),
  );
  if (!highest) {
    return points;
  }
  return round2(points * nftBoosts[highest]);
}

export function getVaults(userId: string) {
  const user = getOrCreateUser(userId);
  return state.vaults.map((vault) => {
    const position = findPosition(user.id, vault.id);
    if (position) {
      position.earnedUsd = accrueSimpleInterest(
        position.principalUsd,
        position.earnedUsd,
        estimateVaultApy(vault),
        position.lastAccruedAt,
      );
      position.lastAccruedAt = nowIso();
    }
    return {
      ...vault,
      estimatedApy: estimateVaultApy(vault),
      estimatedApyLabel: "Estimated APY (testnet model)",
      paused: state.admin.vaultsPaused,
      position: position ?? {
        principalUsd: 0,
        earnedUsd: 0,
      },
    };
  });
}

export function depositToVault(userId: string, vaultId: string, amount: number) {
  getOrCreateUser(userId);
  if (state.admin.vaultsPaused) {
    throw new Error("Vaults are currently paused.");
  }
  const vault = state.vaults.find((item) => item.id === vaultId);
  if (!vault) {
    throw new Error("Vault not found.");
  }
  if (amount > vault.txCapUsd) {
    throw new Error(`Amount exceeds per-transaction cap of ${vault.txCapUsd} USDC.`);
  }
  const existing = findPosition(userId, vaultId);
  if (!existing) {
    state.vaultPositions.push({
      userId,
      vaultId,
      principalUsd: round2(amount),
      earnedUsd: 0,
      lastAccruedAt: nowIso(),
    });
  } else {
    existing.earnedUsd = accrueSimpleInterest(
      existing.principalUsd,
      existing.earnedUsd,
      estimateVaultApy(vault),
      existing.lastAccruedAt,
    );
    existing.principalUsd = round2(existing.principalUsd + amount);
    existing.lastAccruedAt = nowIso();
  }
  vault.tvlUsd = round2(vault.tvlUsd + amount);
  state.vaultEvents.push({
    id: randomId("ve"),
    userId,
    vaultId,
    action: "deposit",
    amount: round2(amount),
    createdAt: nowIso(),
  });
}

export function withdrawFromVault(userId: string, vaultId: string, amount: number) {
  getOrCreateUser(userId);
  const vault = state.vaults.find((item) => item.id === vaultId);
  if (!vault) {
    throw new Error("Vault not found.");
  }
  const position = findPosition(userId, vaultId);
  if (!position) {
    throw new Error("No position found for selected vault.");
  }
  const totalAvailable = position.principalUsd + position.earnedUsd;
  if (amount > totalAvailable) {
    throw new Error("Withdrawal amount exceeds position value.");
  }
  position.earnedUsd = accrueSimpleInterest(
    position.principalUsd,
    position.earnedUsd,
    estimateVaultApy(vault),
    position.lastAccruedAt,
  );

  let remaining = amount;
  if (position.earnedUsd >= remaining) {
    position.earnedUsd = round2(position.earnedUsd - remaining);
  } else {
    remaining = round2(remaining - position.earnedUsd);
    position.earnedUsd = 0;
    position.principalUsd = round2(Math.max(0, position.principalUsd - remaining));
  }
  position.lastAccruedAt = nowIso();
  vault.tvlUsd = round2(Math.max(0, vault.tvlUsd - amount));

  state.vaultEvents.push({
    id: randomId("ve"),
    userId,
    vaultId,
    action: "withdraw",
    amount: round2(amount),
    createdAt: nowIso(),
  });
}

export function quoteSwap(from: "USDC" | "EURC", to: "USDC" | "EURC", amount: number) {
  if (from === to) {
    throw new Error("Invalid pair: source and destination assets must be different.");
  }
  const seed = `${from}-${to}-${Math.floor(Date.now() / (1000 * 60))}`;
  const basis = 1 + (deterministicNumber(seed) - 0.5) * 0.004;
  const rate = round2(basis);
  const outAmount = round2(amount * rate);
  return {
    from,
    to,
    amount: round2(amount),
    rate,
    outAmount,
    slippageBpsSuggested: 30,
    validForSeconds: 30,
  };
}

export function executeSwap(
  userId: string,
  from: "USDC" | "EURC",
  to: "USDC" | "EURC",
  amount: number,
) {
  getOrCreateUser(userId);
  const quote = quoteSwap(from, to, amount);
  const event: SwapEvent = {
    id: randomId("swap"),
    userId,
    from,
    to,
    amount: quote.amount,
    rate: quote.rate,
    outAmount: quote.outAmount,
    createdAt: nowIso(),
  };
  state.swapEvents.push(event);
  return event;
}

export function getSwapHistory(userId: string) {
  return state.swapEvents
    .filter((event) => event.userId === userId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function getUserSummary(userId: string) {
  const user = getOrCreateUser(userId);
  settlePendingPointEvents(userId);
  const swaps = state.swapEvents.filter((item) => item.userId === userId).length;
  const deposits = state.vaultEvents.filter(
    (item) => item.userId === userId && item.action === "deposit",
  ).length;
  return {
    user,
    swaps,
    deposits,
    totalVaultValue: round2(
      state.vaultPositions
        .filter((position) => position.userId === userId)
        .reduce((sum, position) => sum + position.principalUsd + position.earnedUsd, 0),
    ),
  };
}

export function recordPointEvent(
  userId: string,
  taskKey: string,
  metadata: Record<string, unknown> = {},
) {
  const user = getOrCreateUser(userId);
  settlePendingPointEvents(userId);

  const task = taskByKey.get(taskKey);
  if (!task) {
    throw new Error("Unknown task key.");
  }

  const now = new Date();
  const cutoffIso = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const eventsInLastHour = state.pointEvents.filter(
    (event) => event.userId === userId && event.createdAt >= cutoffIso,
  ).length;
  const referralAttemptsInLastHour = state.pointEvents.filter(
    (event) =>
      event.userId === userId &&
      event.key === "invite_friend" &&
      event.createdAt >= cutoffIso,
  ).length;
  const walletAgeDays =
    (now.getTime() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);

  const risk = assessStrictRisk({
    walletAgeDays,
    eventsInLastHour,
    referralAttemptsInLastHour,
    repeatedFundingSource: Boolean(metadata.repeatedFundingSource),
  });

  updateUserRisk(userId, risk.riskFlag, risk.reasons);

  if (risk.riskFlag === "blocked") {
    const blocked: PointEvent = {
      id: randomId("pts"),
      userId,
      key: task.key,
      points: 0,
      status: "blocked",
      reason: risk.reasons.join(","),
      metadata,
      createdAt: nowIso(),
    };
    state.pointEvents.push(blocked);
    return blocked;
  }

  if (task.cooldownHours) {
    const latest = state.pointEvents
      .filter((event) => event.userId === userId && event.key === task.key)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
    if (latest) {
      const elapsedMs = now.getTime() - new Date(latest.createdAt).getTime();
      if (elapsedMs < task.cooldownHours * 60 * 60 * 1000) {
        throw new Error(
          `Task ${task.key} is in cooldown. Try again in ${task.cooldownHours}h.`,
        );
      }
    }
  }

  const boostedPoints = applyPointBoost(userId, task.points);
  const event: PointEvent = {
    id: randomId("pts"),
    userId,
    key: task.key,
    points: boostedPoints,
    status: "settled",
    metadata,
    createdAt: nowIso(),
  };
  if (task.type === "social" && task.socialDelayHours) {
    event.status = "pending";
    event.settlesAt = new Date(now.getTime() + task.socialDelayHours * 60 * 60 * 1000).toISOString();
    user.pointsPending += boostedPoints;
  } else {
    user.pointsSettled += boostedPoints;
    processReferralReward(event);
  }
  state.pointEvents.push(event);
  return event;
}

export function getLeaderboard(period: LeaderboardPeriod) {
  const now = new Date();
  let cutoff = new Date(0);
  if (period === "weekly") {
    cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === "monthly") {
    cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  const totals = new Map<string, number>();
  for (const event of state.pointEvents) {
    if (event.status !== "settled") {
      continue;
    }
    if (new Date(event.createdAt) < cutoff) {
      continue;
    }
    totals.set(event.userId, round2((totals.get(event.userId) ?? 0) + event.points));
  }
  for (const reward of state.referralRewards) {
    if (new Date(reward.createdAt) < cutoff) {
      continue;
    }
    totals.set(
      reward.referrerUserId,
      round2((totals.get(reward.referrerUserId) ?? 0) + reward.points),
    );
  }

  const rows = Array.from(totals.entries())
    .map(([userId, points]) => ({ userId, points }))
    .sort((left, right) => right.points - left.points)
    .slice(0, 10)
    .map((row, index) => ({ ...row, rank: index + 1 }));

  state.leaderboardSnapshots.push({
    id: randomId("lbd"),
    period,
    capturedAt: nowIso(),
    rows,
  });
  return rows;
}

export function applyReferralCode(userId: string, code: string) {
  const user = getOrCreateUser(userId);
  if (user.referredBy) {
    throw new Error("Referral already bound.");
  }
  const referrer = Array.from(state.users.values()).find(
    (item) => item.referralCode === code,
  );
  if (!referrer) {
    throw new Error("Referral code not found.");
  }
  if (referrer.id === userId) {
    throw new Error("Self-referrals are not allowed.");
  }
  user.referredBy = referrer.id;
  state.referrals.push({
    id: randomId("ref"),
    referrerUserId: referrer.id,
    referredUserId: userId,
    createdAt: nowIso(),
  });
  return { referrerUserId: referrer.id };
}

export function enableReferralRewardsForUser(userId: string) {
  const link = state.referrals.find((item) => item.referredUserId === userId);
  if (!link || link.rewardsEnabledAt) {
    return;
  }
  const hasOnchainAction =
    state.swapEvents.some((event) => event.userId === userId) ||
    state.vaultEvents.some((event) => event.userId === userId);
  if (!hasOnchainAction) {
    return;
  }
  link.rewardsEnabledAt = nowIso();
}

export function getReferralStats(userId: string) {
  getOrCreateUser(userId);
  const invites = state.referrals.filter((item) => item.referrerUserId === userId);
  const rewards = state.referralRewards.filter((item) => item.referrerUserId === userId);
  return {
    referralCode: state.users.get(userId)?.referralCode ?? referralCodeFor(userId),
    totalInvites: invites.length,
    activeInvites: invites.filter((item) => Boolean(item.rewardsEnabledAt)).length,
    rewardsEarned: round2(rewards.reduce((sum, reward) => sum + reward.points, 0)),
    rewards,
  };
}

export function getActiveQuests(userId: string) {
  const summary = getUserSummary(userId);
  return weeklyQuests.map((quest) => {
    const run = state.questRuns.find(
      (item) => item.userId === userId && item.questId === quest.id,
    );
    const progress = {
      deposits: summary.deposits,
      swaps: summary.swaps,
      invite_active_friend: getReferralStats(userId).activeInvites,
      social_proof: state.pointEvents.filter(
        (event) =>
          event.userId === userId &&
          event.status !== "blocked" &&
          ["follow_twitter", "retweet_announcement", "join_discord", "like_comment"].includes(
            event.key,
          ),
      ).length,
    };
    return {
      ...quest,
      progress,
      status: run?.status ?? "in_progress",
      completedAt: run?.completedAt,
    };
  });
}

function hasClaim(userId: string, tier: NftTier) {
  return state.nftClaims.some((claim) => claim.userId === userId && claim.tier === tier);
}

export function claimMilestoneNft(userId: string, tier: NftTier) {
  if (tier === "special") {
    throw new Error("Special NFTs are awarded manually in v1.");
  }
  getOrCreateUser(userId);
  const swapCount = state.swapEvents.filter((event) => event.userId === userId).length;
  const threshold = swapMilestones[tier];
  if (swapCount < threshold) {
    throw new Error(`Not eligible. ${threshold} swaps required for ${tier}.`);
  }
  if (hasClaim(userId, tier)) {
    throw new Error(`Tier ${tier} has already been claimed.`);
  }
  const claim: NftClaim = {
    id: randomId("nft"),
    userId,
    tier,
    claimedAt: nowIso(),
  };
  state.nftClaims.push(claim);
  return claim;
}

export function getEligibleNftTiers(userId: string) {
  const swaps = state.swapEvents.filter((event) => event.userId === userId).length;
  const eligible = getEligibleMilestones(swaps);
  return {
    swaps,
    eligible,
    claimed: state.nftClaims
      .filter((claim) => claim.userId === userId)
      .map((claim) => claim.tier),
  };
}

export function completeQuest(userId: string, questId: string) {
  const quest = weeklyQuests.find((item) => item.id === questId);
  if (!quest) {
    throw new Error("Quest not found.");
  }
  const active = getActiveQuests(userId).find((item) => item.id === questId);
  if (!active) {
    throw new Error("Quest not active.");
  }

  const depositOk = active.progress.deposits >= (quest.tasks.find((task) => task.kind === "deposit")?.target ?? 0);
  const swapsOk = active.progress.swaps >= (quest.tasks.find((task) => task.kind === "swaps")?.target ?? 0);
  const inviteOk =
    active.progress.invite_active_friend >=
    (quest.tasks.find((task) => task.kind === "invite_active_friend")?.target ?? 0);
  const socialOk =
    active.progress.social_proof >=
    (quest.tasks.find((task) => task.kind === "social_proof")?.target ?? 0);

  if (!(depositOk && swapsOk && inviteOk && socialOk)) {
    throw new Error("Quest requirements are not yet satisfied.");
  }

  const existing = state.questRuns.find(
    (item) => item.userId === userId && item.questId === questId,
  );
  if (existing?.status === "completed") {
    return existing;
  }

  const run: QuestRun =
    existing ??
    ({
      id: randomId("quest"),
      questId,
      userId,
      status: "in_progress",
      progress: active.progress,
      createdAt: nowIso(),
    } as QuestRun);
  run.status = "completed";
  run.completedAt = nowIso();
  run.progress = active.progress;

  if (!existing) {
    state.questRuns.push(run);
  }

  const user = getOrCreateUser(userId);
  user.pointsSettled += quest.points;
  state.pointEvents.push({
    id: randomId("pts"),
    userId,
    key: `quest_${questId}`,
    points: quest.points,
    status: "settled",
    createdAt: nowIso(),
  });
  return run;
}

export function setVaultPause(paused: boolean, token?: string) {
  if (!config.security.adminApiToken || config.security.adminApiToken !== token) {
    throw new Error("Unauthorized admin token.");
  }
  state.admin.vaultsPaused = paused;
  return state.admin.vaultsPaused;
}

export function setUsername(userId: string, username: string) {
  const normalized = username.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(normalized)) {
    throw new Error("Username must be 3-20 chars, lowercase letters, numbers, or underscore.");
  }
  const takenBy = Array.from(state.users.values()).find(
    (user) => user.username === normalized && user.id !== userId,
  );
  if (takenBy) {
    throw new Error("Username already taken.");
  }
  const user = getOrCreateUser(userId);
  user.username = normalized;
  return user;
}

export function getUserProfile(userId: string) {
  return getOrCreateUser(userId);
}

export function getSystemState() {
  return {
    users: state.users.size,
    swaps: state.swapEvents.length,
    pointEvents: state.pointEvents.length,
    paused: state.admin.vaultsPaused,
    abuseFlags: state.abuseFlags.length,
  };
}
