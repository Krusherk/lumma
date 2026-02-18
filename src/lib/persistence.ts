import { assessStrictRisk } from "@/lib/anti-sybil";
import { accrueSimpleInterest, estimateVaultApy } from "@/lib/apy";
import { config } from "@/lib/config";
import { getEligibleMilestones, nftBoosts, swapMilestones } from "@/lib/nft";
import { weeklyQuests } from "@/lib/quests";
import * as memoryStore from "@/lib/store";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { taskByKey } from "@/lib/tasks";
import type {
  LeaderboardPeriod,
  NftTier,
  PointEvent,
  QuestRun,
  RiskFlag,
  SwapEvent,
  UserProfile,
  VaultDefinition,
} from "@/lib/types";
import { deterministicNumber, nowIso, round2 } from "@/lib/utils";

type DbClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;
type CountQuery = ReturnType<ReturnType<DbClient["from"]>["select"]>;

interface VaultCatalogEntry extends VaultDefinition {
  tvlBaseline: number;
}

const vaultCatalog: VaultCatalogEntry[] = [
  {
    id: "vault-conservative",
    risk: "conservative",
    name: "Conservative Vault",
    apyMin: 5,
    apyMax: 8,
    txCapUsd: 25000,
    tvlUsd: 128000,
    tvlBaseline: 128000,
  },
  {
    id: "vault-balanced",
    risk: "balanced",
    name: "Balanced Vault",
    apyMin: 8,
    apyMax: 12,
    txCapUsd: 25000,
    tvlUsd: 256000,
    tvlBaseline: 256000,
  },
  {
    id: "vault-aggressive",
    risk: "aggressive",
    name: "Aggressive Vault",
    apyMin: 12,
    apyMax: 20,
    txCapUsd: 25000,
    tvlUsd: 512000,
    tvlBaseline: 512000,
  },
];

const socialKeys = ["follow_twitter", "retweet_announcement", "join_discord", "like_comment"];
const USER_COLUMNS =
  "id, created_at, wallet_address, username, referral_code, referred_by, points_settled, points_pending, risk_flag";

function getDbOrNull() {
  return createSupabaseAdminClient();
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

function randomReferralCode() {
  return buildReferralCode(`rnd:${Date.now()}:${Math.random().toString(36).slice(2)}`);
}

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function mapRiskFlag(value: unknown): RiskFlag {
  if (value === "review" || value === "blocked") return value;
  return "none";
}

function mapDbError(error: { message?: string } | null, fallback: string) {
  if (!error) return new Error(fallback);
  if ((error.message ?? "").includes("Could not find the table")) {
    return new Error(`Supabase schema missing. Run migrations first. (${error.message})`);
  }
  return new Error(error.message ?? fallback);
}

function mapUser(row: Record<string, unknown>): UserProfile {
  return {
    id: String(row.id ?? ""),
    createdAt: String(row.created_at ?? nowIso()),
    walletAddress: row.wallet_address ? String(row.wallet_address) : undefined,
    username: row.username ? String(row.username) : undefined,
    referralCode: String(row.referral_code ?? ""),
    referredBy: row.referred_by ? String(row.referred_by) : undefined,
    pointsSettled: toNumber(row.points_settled),
    pointsPending: toNumber(row.points_pending),
    riskFlag: mapRiskFlag(row.risk_flag),
  };
}

function mapPointEvent(row: Record<string, unknown>): PointEvent {
  const status = String(row.status ?? "blocked");
  return {
    id: String(row.id ?? ""),
    userId: String(row.user_id ?? ""),
    key: String(row.key ?? ""),
    points: toNumber(row.points),
    status: status === "pending" || status === "settled" || status === "blocked" ? status : "blocked",
    reason: row.reason ? String(row.reason) : undefined,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: String(row.created_at ?? nowIso()),
    settlesAt: row.settles_at ? String(row.settles_at) : undefined,
  };
}

function mapSwapEvent(row: Record<string, unknown>): SwapEvent {
  return {
    id: String(row.id ?? ""),
    userId: String(row.user_id ?? ""),
    from: String(row.from_asset ?? "USDC") as "USDC" | "EURC",
    to: String(row.to_asset ?? "EURC") as "USDC" | "EURC",
    amount: toNumber(row.amount),
    rate: toNumber(row.rate),
    outAmount: toNumber(row.out_amount),
    createdAt: String(row.created_at ?? nowIso()),
  };
}

function mapQuestRun(row: Record<string, unknown>): QuestRun {
  const status = String(row.status ?? "in_progress");
  return {
    id: String(row.id ?? ""),
    questId: String(row.quest_id ?? ""),
    userId: String(row.user_id ?? ""),
    status: status === "completed" ? "completed" : "in_progress",
    progress: (row.progress ?? {}) as Record<string, number>,
    completedAt: row.completed_at ? String(row.completed_at) : undefined,
    createdAt: String(row.created_at ?? nowIso()),
  };
}

async function countRows(
  db: DbClient,
  table: string,
  filters?: (query: CountQuery) => CountQuery,
) {
  let query = db.from(table).select("*", { head: true, count: "exact" }) as unknown as CountQuery;
  if (filters) {
    query = filters(query);
  }
  const { count, error } = await query;
  if (error) throw mapDbError(error, `Failed counting ${table}.`);
  return count ?? 0;
}

async function ensureUserDb(userId: string, walletAddress?: string) {
  const db = getDbOrNull();
  if (!db) return memoryStore.getOrCreateUser(userId, walletAddress);

  const fetchUser = async () => {
    const { data, error } = await db.from("users").select(USER_COLUMNS).eq("id", userId).maybeSingle();
    if (error) throw mapDbError(error, "Failed to fetch user.");
    return data as Record<string, unknown> | null;
  };

  const withWallet = async (row: Record<string, unknown>) => {
    if (walletAddress && String(row.wallet_address ?? "") !== walletAddress) {
      const { error } = await db.from("users").update({ wallet_address: walletAddress }).eq("id", userId);
      if (error) throw mapDbError(error, "Failed to update wallet address.");
      row.wallet_address = walletAddress;
    }
    return mapUser(row);
  };

  const existing = await fetchUser();
  if (existing) {
    return withWallet(existing);
  }

  const candidates = [
    referralCodeFor(userId),
    ...Array.from({ length: 5 }, (_, index) => referralCodeVariant(userId, index + 1)),
    ...Array.from({ length: 4 }, () => randomReferralCode()),
  ];

  for (const referralCode of candidates) {
    const payload: Record<string, unknown> = { id: userId, referral_code: referralCode };
    if (walletAddress) {
      payload.wallet_address = walletAddress;
    }

    const { data, error } = await db.from("users").insert(payload).select(USER_COLUMNS).maybeSingle();
    if (!error && data) {
      return mapUser(data as Record<string, unknown>);
    }
    if (!error) {
      continue;
    }
    if (error.code === "23505") {
      const message = String(error.message ?? "");
      if (message.includes("users_pkey")) {
        const raced = await fetchUser();
        if (raced) {
          return withWallet(raced);
        }
      }
      if (message.includes("users_referral_code")) {
        continue;
      }
    }
    throw mapDbError(error, "Failed to create user.");
  }

  throw new Error("Failed to reserve unique referral code for user.");
}

async function updateUserPoints(db: DbClient, userId: string, deltaSettled: number, deltaPending: number) {
  const user = await ensureUserDb(userId);
  const nextSettled = round2(user.pointsSettled + deltaSettled);
  const nextPending = round2(Math.max(0, user.pointsPending + deltaPending));
  const { error } = await db
    .from("users")
    .update({ points_settled: nextSettled, points_pending: nextPending })
    .eq("id", userId);
  if (error) throw mapDbError(error, "Failed to update user points.");
  return { pointsSettled: nextSettled, pointsPending: nextPending };
}

async function processReferralRewardDb(db: DbClient, sourceUserId: string, sourceEventId: string, sourcePoints: number) {
  const { data: link, error: linkError } = await db
    .from("referrals")
    .select("id, referrer_user_id, rewards_enabled_at")
    .eq("referred_user_id", sourceUserId)
    .maybeSingle();
  if (linkError) throw mapDbError(linkError, "Failed to load referral link.");
  if (!link?.rewards_enabled_at) return;

  const { count, error: dupeError } = await db
    .from("referral_rewards")
    .select("*", { head: true, count: "exact" })
    .eq("referrer_user_id", link.referrer_user_id)
    .eq("source_event_id", sourceEventId);
  if (dupeError) throw mapDbError(dupeError, "Failed checking referral reward duplication.");
  if ((count ?? 0) > 0) return;

  const rewardPoints = round2(sourcePoints * 0.1);
  const { error: insertError } = await db.from("referral_rewards").insert({
    referrer_user_id: link.referrer_user_id,
    source_user_id: sourceUserId,
    source_event_id: sourceEventId,
    points: rewardPoints,
  });
  if (insertError) throw mapDbError(insertError, "Failed to insert referral reward.");
  await updateUserPoints(db, String(link.referrer_user_id), rewardPoints, 0);
}

async function settlePendingPointEventsDb(userId: string) {
  const db = getDbOrNull();
  if (!db) return;
  const { data, error } = await db
    .from("point_events")
    .update({ status: "settled" })
    .eq("user_id", userId)
    .eq("status", "pending")
    .lte("settles_at", nowIso())
    .select("id, points");
  if (error) throw mapDbError(error, "Failed settling pending points.");
  if (!data?.length) return;

  const settledPoints = round2(data.reduce((sum, row) => sum + toNumber(row.points), 0));
  await updateUserPoints(db, userId, settledPoints, -settledPoints);
  for (const row of data) {
    await processReferralRewardDb(db, userId, String(row.id), toNumber(row.points));
  }
}

async function getVaultPaused(db: DbClient) {
  const { data, error } = await db
    .from("system_flags")
    .select("value")
    .eq("key", "vault_pause")
    .maybeSingle();
  if (error) {
    if (String(error.message).includes("Could not find the table")) return false;
    throw mapDbError(error, "Failed loading vault pause state.");
  }
  return Boolean((data?.value as { paused?: boolean } | null)?.paused);
}

async function applyPointBoostDb(db: DbClient, userId: string, points: number) {
  const { data, error } = await db.from("nft_claims").select("tier").eq("user_id", userId);
  if (error) throw mapDbError(error, "Failed loading NFT boosts.");
  const claimed = new Set((data ?? []).map((row) => String(row.tier)));
  const order: Array<Exclude<NftTier, "special">> = ["diamond", "gold", "silver", "bronze"];
  const highest = order.find((tier) => claimed.has(tier));
  if (!highest) return points;
  return round2(points * nftBoosts[highest]);
}

export async function getOrCreateUser(userId: string, walletAddress?: string) {
  return ensureUserDb(userId, walletAddress);
}

export async function getUserProfile(userId: string) {
  return ensureUserDb(userId);
}

export async function setUsername(userId: string, username: string, walletAddress?: string) {
  const normalized = username.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(normalized)) {
    throw new Error("Username must be 3-20 chars, lowercase letters, numbers, or underscore.");
  }
  const db = getDbOrNull();
  if (!db) return memoryStore.setUsername(userId, normalized);

  await ensureUserDb(userId, walletAddress);
  const { error } = await db.from("users").update({ username: normalized }).eq("id", userId);
  if (error) {
    if (error.code === "23505") throw new Error("Username already taken.");
    throw mapDbError(error, "Failed saving username.");
  }
  return ensureUserDb(userId);
}

export async function quoteSwap(from: "USDC" | "EURC", to: "USDC" | "EURC", amount: number) {
  if (from === to) throw new Error("Invalid pair: source and destination assets must be different.");
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

export async function executeSwap(userId: string, from: "USDC" | "EURC", to: "USDC" | "EURC", amount: number) {
  const db = getDbOrNull();
  if (!db) return memoryStore.executeSwap(userId, from, to, amount);

  await ensureUserDb(userId);
  const quote = await quoteSwap(from, to, amount);
  const { data, error } = await db
    .from("swap_events")
    .insert({
      user_id: userId,
      from_asset: quote.from,
      to_asset: quote.to,
      amount: quote.amount,
      rate: quote.rate,
      out_amount: quote.outAmount,
    })
    .select("*")
    .single();
  if (error || !data) throw mapDbError(error, "Failed storing swap event.");
  return mapSwapEvent(data as unknown as Record<string, unknown>);
}

export async function getSwapHistory(userId: string) {
  const db = getDbOrNull();
  if (!db) return memoryStore.getSwapHistory(userId);

  await ensureUserDb(userId);
  const { data, error } = await db
    .from("swap_events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw mapDbError(error, "Failed loading swap history.");
  return (data ?? []).map((row) => mapSwapEvent(row as unknown as Record<string, unknown>));
}

export async function getVaults(userId: string) {
  const db = getDbOrNull();
  if (!db) return memoryStore.getVaults(userId);

  await ensureUserDb(userId);
  const paused = await getVaultPaused(db);

  const { data: userRows, error: userError } = await db
    .from("vault_positions")
    .select("vault_id, principal_usd, earned_usd, last_accrued_at")
    .eq("user_id", userId);
  if (userError) throw mapDbError(userError, "Failed loading user vault positions.");

  const { data: allRows, error: allError } = await db
    .from("vault_positions")
    .select("vault_id, principal_usd, earned_usd");
  if (allError) throw mapDbError(allError, "Failed loading TVL positions.");

  const userByVault = new Map((userRows ?? []).map((row) => [String(row.vault_id), row]));
  const tvlByVault = new Map<string, number>();
  for (const row of allRows ?? []) {
    const id = String(row.vault_id ?? "");
    const value = round2(toNumber(row.principal_usd) + toNumber(row.earned_usd));
    tvlByVault.set(id, round2((tvlByVault.get(id) ?? 0) + value));
  }

  const now = new Date();
  const result = [];
  for (const vault of vaultCatalog) {
    const estimatedApy = estimateVaultApy(vault, now);
    const row = userByVault.get(vault.id);
    let principal = 0;
    let earned = 0;
    if (row) {
      principal = toNumber(row.principal_usd);
      earned = toNumber(row.earned_usd);
      const accrued = accrueSimpleInterest(principal, earned, estimatedApy, String(row.last_accrued_at ?? nowIso()), now);
      if (accrued !== earned) {
        const { error: accrueError } = await db
          .from("vault_positions")
          .update({ earned_usd: accrued, last_accrued_at: nowIso() })
          .eq("user_id", userId)
          .eq("vault_id", vault.id);
        if (accrueError) throw mapDbError(accrueError, "Failed updating accrued vault yield.");
        const priorTotal = round2(principal + earned);
        const nextTotal = round2(principal + accrued);
        tvlByVault.set(vault.id, round2((tvlByVault.get(vault.id) ?? 0) - priorTotal + nextTotal));
        earned = accrued;
      }
    }

    result.push({
      id: vault.id,
      name: vault.name,
      risk: vault.risk,
      apyMin: vault.apyMin,
      apyMax: vault.apyMax,
      estimatedApy,
      estimatedApyLabel: "Estimated APY (testnet model)",
      tvlUsd: round2(vault.tvlBaseline + (tvlByVault.get(vault.id) ?? 0)),
      txCapUsd: vault.txCapUsd,
      paused,
      position: {
        principalUsd: round2(principal),
        earnedUsd: round2(earned),
      },
    });
  }
  return result;
}

export async function depositToVault(userId: string, vaultId: string, amount: number) {
  const db = getDbOrNull();
  if (!db) {
    memoryStore.depositToVault(userId, vaultId, amount);
    return;
  }

  await ensureUserDb(userId);
  if (await getVaultPaused(db)) throw new Error("Vaults are currently paused.");

  const vault = vaultCatalog.find((item) => item.id === vaultId);
  if (!vault) throw new Error("Vault not found.");
  if (amount > vault.txCapUsd) {
    throw new Error(`Amount exceeds per-transaction cap of ${vault.txCapUsd} USDC.`);
  }

  const now = new Date();
  const { data: existing, error: existingError } = await db
    .from("vault_positions")
    .select("principal_usd, earned_usd, last_accrued_at")
    .eq("user_id", userId)
    .eq("vault_id", vaultId)
    .maybeSingle();
  if (existingError) throw mapDbError(existingError, "Failed loading vault position.");

  if (!existing) {
    const { error: insertError } = await db.from("vault_positions").insert({
      user_id: userId,
      vault_id: vaultId,
      risk: vault.risk,
      principal_usd: round2(amount),
      earned_usd: 0,
      last_accrued_at: nowIso(),
    });
    if (insertError) throw mapDbError(insertError, "Failed creating vault position.");
  } else {
    const principal = toNumber(existing.principal_usd);
    const earned = toNumber(existing.earned_usd);
    const accrued = accrueSimpleInterest(principal, earned, estimateVaultApy(vault, now), String(existing.last_accrued_at ?? nowIso()), now);
    const { error: updateError } = await db
      .from("vault_positions")
      .update({ principal_usd: round2(principal + amount), earned_usd: round2(accrued), last_accrued_at: nowIso() })
      .eq("user_id", userId)
      .eq("vault_id", vaultId);
    if (updateError) throw mapDbError(updateError, "Failed updating vault position.");
  }

  const { error: eventError } = await db.from("vault_events").insert({
    user_id: userId,
    vault_id: vaultId,
    action: "deposit",
    amount: round2(amount),
  });
  if (eventError) throw mapDbError(eventError, "Failed creating vault event.");
}

export async function withdrawFromVault(userId: string, vaultId: string, amount: number) {
  const db = getDbOrNull();
  if (!db) {
    memoryStore.withdrawFromVault(userId, vaultId, amount);
    return;
  }

  await ensureUserDb(userId);
  const vault = vaultCatalog.find((item) => item.id === vaultId);
  if (!vault) throw new Error("Vault not found.");

  const now = new Date();
  const { data: row, error } = await db
    .from("vault_positions")
    .select("principal_usd, earned_usd, last_accrued_at")
    .eq("user_id", userId)
    .eq("vault_id", vaultId)
    .maybeSingle();
  if (error) throw mapDbError(error, "Failed loading vault position.");
  if (!row) throw new Error("No position found for selected vault.");

  let principal = toNumber(row.principal_usd);
  let earned = toNumber(row.earned_usd);
  earned = accrueSimpleInterest(principal, earned, estimateVaultApy(vault, now), String(row.last_accrued_at ?? nowIso()), now);

  const totalAvailable = round2(principal + earned);
  if (amount > totalAvailable) throw new Error("Withdrawal amount exceeds position value.");

  if (earned >= amount) {
    earned = round2(earned - amount);
  } else {
    const remaining = round2(amount - earned);
    earned = 0;
    principal = round2(Math.max(0, principal - remaining));
  }

  const { error: updateError } = await db
    .from("vault_positions")
    .update({ principal_usd: principal, earned_usd: earned, last_accrued_at: nowIso() })
    .eq("user_id", userId)
    .eq("vault_id", vaultId);
  if (updateError) throw mapDbError(updateError, "Failed updating vault withdrawal.");

  const { error: eventError } = await db.from("vault_events").insert({
    user_id: userId,
    vault_id: vaultId,
    action: "withdraw",
    amount: round2(amount),
  });
  if (eventError) throw mapDbError(eventError, "Failed creating withdrawal event.");
}

export async function getUserSummary(userId: string) {
  const db = getDbOrNull();
  if (!db) return memoryStore.getUserSummary(userId);

  await ensureUserDb(userId);
  await settlePendingPointEventsDb(userId);
  const user = await ensureUserDb(userId);

  const [swaps, deposits] = await Promise.all([
    countRows(db, "swap_events", (query) => query.eq("user_id", userId)),
    countRows(db, "vault_events", (query) => query.eq("user_id", userId).eq("action", "deposit")),
  ]);

  const { data: positions, error } = await db
    .from("vault_positions")
    .select("principal_usd, earned_usd")
    .eq("user_id", userId);
  if (error) throw mapDbError(error, "Failed loading user vault value.");

  const totalVaultValue = round2(
    (positions ?? []).reduce((sum, row) => sum + toNumber(row.principal_usd) + toNumber(row.earned_usd), 0),
  );

  return {
    user,
    swaps,
    deposits,
    totalVaultValue,
  };
}

export async function recordPointEvent(userId: string, taskKey: string, metadata: Record<string, unknown> = {}) {
  const db = getDbOrNull();
  if (!db) return memoryStore.recordPointEvent(userId, taskKey, metadata);

  const user = await ensureUserDb(userId);
  await settlePendingPointEventsDb(userId);

  const task = taskByKey.get(taskKey);
  if (!task) throw new Error("Unknown task key.");

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const [eventsInLastHour, referralAttemptsInLastHour] = await Promise.all([
    countRows(db, "point_events", (query) => query.eq("user_id", userId).gte("created_at", oneHourAgo)),
    countRows(db, "point_events", (query) =>
      query.eq("user_id", userId).eq("key", "invite_friend").gte("created_at", oneHourAgo),
    ),
  ]);

  const walletAgeDays = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  const risk = assessStrictRisk({
    walletAgeDays,
    eventsInLastHour,
    referralAttemptsInLastHour,
    repeatedFundingSource: Boolean(metadata.repeatedFundingSource),
  });

  const { error: riskError } = await db.from("users").update({ risk_flag: risk.riskFlag }).eq("id", userId);
  if (riskError) throw mapDbError(riskError, "Failed updating risk flag.");

  if (risk.reasons.length) {
    const rows = risk.reasons.map((reason) => ({
      user_id: userId,
      signal: reason,
      score: risk.riskFlag === "blocked" ? 80 : 40,
    }));
    const { error: abuseError } = await db.from("abuse_flags").insert(rows);
    if (abuseError) throw mapDbError(abuseError, "Failed writing abuse flags.");
  }

  if (risk.riskFlag === "blocked") {
    const { data, error } = await db
      .from("point_events")
      .insert({
        user_id: userId,
        key: task.key,
        task_type: task.type,
        points: 0,
        status: "blocked",
        reason: risk.reasons.join(","),
        metadata,
      })
      .select("*")
      .single();
    if (error || !data) throw mapDbError(error, "Failed writing blocked point event.");
    return mapPointEvent(data as unknown as Record<string, unknown>);
  }

  if (task.cooldownHours) {
    const { data: latest, error: latestError } = await db
      .from("point_events")
      .select("created_at")
      .eq("user_id", userId)
      .eq("key", task.key)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestError) throw mapDbError(latestError, "Failed validating cooldown.");
    if (latest?.created_at) {
      const elapsedMs = Date.now() - new Date(String(latest.created_at)).getTime();
      if (elapsedMs < task.cooldownHours * 60 * 60 * 1000) {
        throw new Error(`Task ${task.key} is in cooldown. Try again in ${task.cooldownHours}h.`);
      }
    }
  }

  const boostedPoints = await applyPointBoostDb(db, userId, task.points);
  const payload: Record<string, unknown> = {
    user_id: userId,
    key: task.key,
    task_type: task.type,
    points: boostedPoints,
    status: "settled",
    metadata,
  };

  if (task.type === "social" && task.socialDelayHours) {
    payload.status = "pending";
    payload.settles_at = new Date(Date.now() + task.socialDelayHours * 60 * 60 * 1000).toISOString();
  }

  const { data: eventRow, error: eventError } = await db.from("point_events").insert(payload).select("*").single();
  if (eventError || !eventRow) throw mapDbError(eventError, "Failed writing point event.");

  if (payload.status === "pending") {
    await updateUserPoints(db, userId, 0, boostedPoints);
  } else {
    await updateUserPoints(db, userId, boostedPoints, 0);
    await processReferralRewardDb(db, userId, String(eventRow.id), boostedPoints);
  }

  return mapPointEvent(eventRow as unknown as Record<string, unknown>);
}

export async function applyReferralCode(userId: string, code: string) {
  const db = getDbOrNull();
  if (!db) return memoryStore.applyReferralCode(userId, code);

  const user = await ensureUserDb(userId);
  if (user.referredBy) throw new Error("Referral already bound.");

  const normalized = code.toUpperCase().trim();
  const { data: referrer, error: referrerError } = await db
    .from("users")
    .select("id")
    .eq("referral_code", normalized)
    .maybeSingle();
  if (referrerError) throw mapDbError(referrerError, "Failed loading referral code.");
  if (!referrer) throw new Error("Referral code not found.");
  if (String(referrer.id) === userId) throw new Error("Self-referrals are not allowed.");

  const { error: userError } = await db.from("users").update({ referred_by: String(referrer.id) }).eq("id", userId);
  if (userError) throw mapDbError(userError, "Failed binding referred_by.");

  const { error: linkError } = await db.from("referrals").insert({
    referrer_user_id: String(referrer.id),
    referred_user_id: userId,
  });
  if (linkError && linkError.code !== "23505") throw mapDbError(linkError, "Failed creating referral link.");

  return { referrerUserId: String(referrer.id) };
}

export async function enableReferralRewardsForUser(userId: string) {
  const db = getDbOrNull();
  if (!db) {
    memoryStore.enableReferralRewardsForUser(userId);
    return;
  }

  const { data: link, error: linkError } = await db
    .from("referrals")
    .select("id, rewards_enabled_at")
    .eq("referred_user_id", userId)
    .maybeSingle();
  if (linkError) throw mapDbError(linkError, "Failed loading referral activation.");
  if (!link || link.rewards_enabled_at) return;

  const [swapCount, vaultCount] = await Promise.all([
    countRows(db, "swap_events", (query) => query.eq("user_id", userId)),
    countRows(db, "vault_events", (query) => query.eq("user_id", userId)),
  ]);
  if (swapCount + vaultCount <= 0) return;

  const { error: enableError } = await db
    .from("referrals")
    .update({ rewards_enabled_at: nowIso() })
    .eq("id", link.id);
  if (enableError) throw mapDbError(enableError, "Failed enabling referral rewards.");
}

export async function getReferralStats(userId: string) {
  const db = getDbOrNull();
  if (!db) return memoryStore.getReferralStats(userId);

  const user = await ensureUserDb(userId);
  const [{ data: inviteRows, error: inviteError }, { data: rewardRows, error: rewardError }] = await Promise.all([
    db.from("referrals").select("id, referred_user_id, rewards_enabled_at, created_at").eq("referrer_user_id", userId),
    db.from("referral_rewards").select("id, source_user_id, source_event_id, points, created_at").eq("referrer_user_id", userId),
  ]);
  if (inviteError) throw mapDbError(inviteError, "Failed loading referral invites.");
  if (rewardError) throw mapDbError(rewardError, "Failed loading referral rewards.");

  return {
    referralCode: user.referralCode,
    totalInvites: (inviteRows ?? []).length,
    activeInvites: (inviteRows ?? []).filter((row) => Boolean(row.rewards_enabled_at)).length,
    rewardsEarned: round2((rewardRows ?? []).reduce((sum, row) => sum + toNumber(row.points), 0)),
    rewards: (rewardRows ?? []).map((row) => ({
      id: String(row.id ?? ""),
      referrerUserId: userId,
      sourceUserId: String(row.source_user_id ?? ""),
      sourceEventId: String(row.source_event_id ?? ""),
      points: toNumber(row.points),
      createdAt: String(row.created_at ?? nowIso()),
    })),
  };
}

export async function getLeaderboard(period: LeaderboardPeriod) {
  const db = getDbOrNull();
  if (!db) return memoryStore.getLeaderboard(period);

  let cutoffIso: string | null = null;
  if (period === "weekly") cutoffIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  if (period === "monthly") cutoffIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  let pointQuery = db.from("point_events").select("user_id, points").eq("status", "settled");
  let rewardQuery = db.from("referral_rewards").select("referrer_user_id, points");
  if (cutoffIso) {
    pointQuery = pointQuery.gte("created_at", cutoffIso);
    rewardQuery = rewardQuery.gte("created_at", cutoffIso);
  }

  const [{ data: pointsRows, error: pointsError }, { data: rewardRows, error: rewardError }] = await Promise.all([
    pointQuery,
    rewardQuery,
  ]);
  if (pointsError) throw mapDbError(pointsError, "Failed loading settled point rows.");
  if (rewardError) throw mapDbError(rewardError, "Failed loading referral reward rows.");

  const totals = new Map<string, number>();
  for (const row of pointsRows ?? []) {
    const id = String(row.user_id ?? "");
    totals.set(id, round2((totals.get(id) ?? 0) + toNumber(row.points)));
  }
  for (const row of rewardRows ?? []) {
    const id = String(row.referrer_user_id ?? "");
    totals.set(id, round2((totals.get(id) ?? 0) + toNumber(row.points)));
  }

  const rows = Array.from(totals.entries())
    .map(([userId, points]) => ({ userId, points }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 10)
    .map((row, index) => ({ ...row, rank: index + 1 }));

  const { error: snapshotError } = await db.from("leaderboard_snapshots").insert({
    period,
    rows,
  });
  if (snapshotError) throw mapDbError(snapshotError, "Failed writing leaderboard snapshot.");

  return rows;
}

export async function getActiveQuests(userId: string) {
  const db = getDbOrNull();
  if (!db) return memoryStore.getActiveQuests(userId);

  const summary = await getUserSummary(userId);
  const referralStats = await getReferralStats(userId);
  const socialProof = await countRows(db, "point_events", (query) =>
    query.eq("user_id", userId).neq("status", "blocked").in("key", socialKeys),
  );

  const { data: runRows, error: runError } = await db.from("quest_runs").select("*").eq("user_id", userId);
  if (runError) throw mapDbError(runError, "Failed loading quest runs.");

  const runByQuest = new Map((runRows ?? []).map((row) => [String(row.quest_id), row]));
  return weeklyQuests.map((quest) => {
    const run = runByQuest.get(quest.id);
    return {
      ...quest,
      progress: {
        deposits: summary.deposits,
        swaps: summary.swaps,
        invite_active_friend: referralStats.activeInvites,
        social_proof: socialProof,
      },
      status: run?.status === "completed" ? "completed" : "in_progress",
      completedAt: run?.completed_at ? String(run.completed_at) : undefined,
    };
  });
}

export async function completeQuest(userId: string, questId: string) {
  const db = getDbOrNull();
  if (!db) return memoryStore.completeQuest(userId, questId);

  const quest = weeklyQuests.find((item) => item.id === questId);
  if (!quest) throw new Error("Quest not found.");

  const active = (await getActiveQuests(userId)).find((item) => item.id === questId);
  if (!active) throw new Error("Quest not active.");

  const depositOk = active.progress.deposits >= (quest.tasks.find((task) => task.kind === "deposit")?.target ?? 0);
  const swapsOk = active.progress.swaps >= (quest.tasks.find((task) => task.kind === "swaps")?.target ?? 0);
  const inviteOk =
    active.progress.invite_active_friend >=
    (quest.tasks.find((task) => task.kind === "invite_active_friend")?.target ?? 0);
  const socialOk =
    active.progress.social_proof >= (quest.tasks.find((task) => task.kind === "social_proof")?.target ?? 0);

  if (!(depositOk && swapsOk && inviteOk && socialOk)) {
    throw new Error("Quest requirements are not yet satisfied.");
  }

  const { data: existingRun, error: existingError } = await db
    .from("quest_runs")
    .select("*")
    .eq("user_id", userId)
    .eq("quest_id", questId)
    .maybeSingle();
  if (existingError) throw mapDbError(existingError, "Failed loading existing quest run.");
  if (existingRun?.status === "completed") {
    return mapQuestRun(existingRun as unknown as Record<string, unknown>);
  }

  const { data: runRow, error: runError } = await db
    .from("quest_runs")
    .upsert(
      {
        user_id: userId,
        quest_id: questId,
        status: "completed",
        progress: active.progress,
        completed_at: nowIso(),
      },
      { onConflict: "quest_id,user_id" },
    )
    .select("*")
    .single();
  if (runError || !runRow) throw mapDbError(runError, "Failed completing quest run.");

  const questEventKey = `quest_${questId}`;
  const { count: existingQuestReward, error: rewardCountError } = await db
    .from("point_events")
    .select("*", { head: true, count: "exact" })
    .eq("user_id", userId)
    .eq("key", questEventKey)
    .eq("status", "settled");
  if (rewardCountError) throw mapDbError(rewardCountError, "Failed validating quest reward duplication.");

  if ((existingQuestReward ?? 0) === 0) {
    const { data: eventRow, error: eventError } = await db
      .from("point_events")
      .insert({
        user_id: userId,
        key: questEventKey,
        task_type: "quest",
        points: quest.points,
        status: "settled",
        metadata: {},
      })
      .select("id")
      .single();
    if (eventError || !eventRow) throw mapDbError(eventError, "Failed writing quest point event.");

    await updateUserPoints(db, userId, quest.points, 0);
    await processReferralRewardDb(db, userId, String(eventRow.id), quest.points);
  }

  return mapQuestRun(runRow as unknown as Record<string, unknown>);
}

export async function getEligibleNftTiers(userId: string) {
  const db = getDbOrNull();
  if (!db) return memoryStore.getEligibleNftTiers(userId);

  await ensureUserDb(userId);
  const [swaps, claimsResult] = await Promise.all([
    countRows(db, "swap_events", (query) => query.eq("user_id", userId)),
    db.from("nft_claims").select("tier").eq("user_id", userId),
  ]);
  if (claimsResult.error) throw mapDbError(claimsResult.error, "Failed loading NFT claims.");

  return {
    swaps,
    eligible: getEligibleMilestones(swaps),
    claimed: (claimsResult.data ?? []).map((row) => String(row.tier)),
  };
}

export async function claimMilestoneNft(userId: string, tier: NftTier, options?: { txHash?: string; tokenId?: number }) {
  const db = getDbOrNull();
  if (!db) return memoryStore.claimMilestoneNft(userId, tier);

  if (tier === "special") throw new Error("Special NFTs are awarded manually in v1.");
  await ensureUserDb(userId);

  const swaps = await countRows(db, "swap_events", (query) => query.eq("user_id", userId));
  const required = swapMilestones[tier];
  if (swaps < required) throw new Error(`Not eligible. ${required} swaps required for ${tier}.`);

  const { count: existing, error: existingError } = await db
    .from("nft_claims")
    .select("*", { head: true, count: "exact" })
    .eq("user_id", userId)
    .eq("tier", tier);
  if (existingError) throw mapDbError(existingError, "Failed validating claim duplication.");
  if ((existing ?? 0) > 0) throw new Error(`Tier ${tier} has already been claimed.`);

  const { data, error } = await db
    .from("nft_claims")
    .insert({
      user_id: userId,
      tier,
      token_id: options?.tokenId ?? null,
      tx_hash: options?.txHash ?? null,
    })
    .select("*")
    .single();
  if (error || !data) throw mapDbError(error, "Failed creating NFT claim.");

  return {
    id: String(data.id ?? ""),
    userId: String(data.user_id ?? userId),
    tier: String(data.tier ?? tier),
    tokenId: data.token_id ? Number(data.token_id) : undefined,
    txHash: data.tx_hash ? String(data.tx_hash) : undefined,
    claimedAt: String(data.claimed_at ?? nowIso()),
  };
}

export async function setVaultPause(paused: boolean, token?: string) {
  if (!config.security.adminApiToken || config.security.adminApiToken !== token) {
    throw new Error("Unauthorized admin token.");
  }

  const db = getDbOrNull();
  if (!db) {
    memoryStore.setVaultPause(paused, token);
    return paused;
  }

  const { error } = await db.from("system_flags").upsert(
    {
      key: "vault_pause",
      value: { paused },
      updated_at: nowIso(),
    },
    { onConflict: "key" },
  );
  if (error) throw mapDbError(error, "Failed saving vault pause flag.");
  return paused;
}

export async function getSystemState() {
  const db = getDbOrNull();
  if (!db) return memoryStore.getSystemState();

  const [users, swaps, pointEvents, abuseFlags, paused] = await Promise.all([
    countRows(db, "users"),
    countRows(db, "swap_events"),
    countRows(db, "point_events"),
    countRows(db, "abuse_flags"),
    getVaultPaused(db),
  ]);

  return {
    users,
    swaps,
    pointEvents,
    paused,
    abuseFlags,
  };
}
