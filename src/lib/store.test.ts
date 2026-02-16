import { describe, expect, it } from "vitest";

import { executeSwap, getEligibleNftTiers, getLeaderboard, getReferralStats, getUserSummary, recordPointEvent } from "@/lib/store";

describe("store scoring and leaderboard flows", () => {
  it("tracks swaps for milestone progress", () => {
    const userId = `test-user-${Date.now()}`;
    for (let index = 0; index < 26; index += 1) {
      executeSwap(userId, "USDC", "EURC", 10);
    }
    const eligibility = getEligibleNftTiers(userId);
    expect(eligibility.swaps).toBeGreaterThanOrEqual(26);
    expect(eligibility.eligible).toContain("bronze");
  });

  it("settles normal point events", () => {
    const userId = `points-user-${Date.now()}`;
    const event = recordPointEvent(userId, "connect_wallet");
    const summary = getUserSummary(userId);
    expect(event.status).toBe("settled");
    expect(summary.user.pointsSettled).toBeGreaterThan(0);
  });

  it("returns leaderboard rows", () => {
    const userId = `leaderboard-user-${Date.now()}`;
    recordPointEvent(userId, "connect_wallet");
    const rows = getLeaderboard("weekly");
    expect(rows.length).toBeGreaterThan(0);
  });

  it("returns referral stats with code", () => {
    const userId = `ref-user-${Date.now()}`;
    const stats = getReferralStats(userId);
    expect(stats.referralCode.startsWith("LUM-")).toBe(true);
  });
});

