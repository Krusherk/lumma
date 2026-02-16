import { getUserIdFromRequest, ok } from "@/lib/api";
import { getEligibleNftTiers, getReferralStats, getUserSummary } from "@/lib/store";

export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request);
  return ok({
    userId,
    summary: getUserSummary(userId),
    referrals: getReferralStats(userId),
    nft: getEligibleNftTiers(userId),
  });
}

