export type VaultRisk = "conservative" | "balanced" | "aggressive";
export type TaskType = "daily" | "social" | "activity" | "quest";
export type LeaderboardPeriod = "weekly" | "monthly" | "all_time";
export type NftTier = "bronze" | "silver" | "gold" | "diamond" | "special";
export type RiskFlag = "none" | "review" | "blocked";

export interface VaultDefinition {
  id: string;
  risk: VaultRisk;
  name: string;
  apyMin: number;
  apyMax: number;
  tvlUsd: number;
  txCapUsd: number;
}

export interface VaultPosition {
  userId: string;
  vaultId: string;
  principalUsd: number;
  earnedUsd: number;
  lastAccruedAt: string;
}

export interface VaultEvent {
  id: string;
  userId: string;
  vaultId: string;
  action: "deposit" | "withdraw";
  amount: number;
  createdAt: string;
}

export interface SwapEvent {
  id: string;
  userId: string;
  from: "USDC" | "EURC";
  to: "USDC" | "EURC";
  amount: number;
  rate: number;
  outAmount: number;
  createdAt: string;
}

export interface PointEvent {
  id: string;
  userId: string;
  key: string;
  points: number;
  status: "pending" | "settled" | "blocked";
  reason?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  settlesAt?: string;
}

export interface UserProfile {
  id: string;
  createdAt: string;
  walletAddress?: string;
  username?: string;
  referralCode: string;
  referredBy?: string;
  pointsSettled: number;
  pointsPending: number;
  riskFlag: RiskFlag;
}

export interface ReferralLink {
  id: string;
  referrerUserId: string;
  referredUserId: string;
  createdAt: string;
  rewardsEnabledAt?: string;
}

export interface ReferralReward {
  id: string;
  referrerUserId: string;
  sourceUserId: string;
  sourceEventId: string;
  points: number;
  createdAt: string;
}

export interface QuestRun {
  id: string;
  questId: string;
  userId: string;
  status: "in_progress" | "completed";
  progress: Record<string, number>;
  completedAt?: string;
  createdAt: string;
}

export interface NftClaim {
  id: string;
  userId: string;
  tier: NftTier;
  tokenId?: number;
  claimedAt: string;
}

export interface AbuseFlag {
  id: string;
  userId: string;
  signal: string;
  score: number;
  createdAt: string;
}

export interface LeaderboardSnapshot {
  id: string;
  period: LeaderboardPeriod;
  capturedAt: string;
  rows: Array<{ userId: string; points: number; rank: number }>;
}

export interface QuestDefinition {
  id: string;
  name: string;
  week: string;
  points: number;
  scarcity: number;
  tasks: Array<{
    id: string;
    label: string;
    kind: "deposit" | "swaps" | "invite_active_friend" | "social_proof";
    target: number;
  }>;
}

export interface TaskDefinition {
  key: string;
  label: string;
  type: TaskType;
  points: number;
  cooldownHours?: number;
  socialDelayHours?: number;
}
