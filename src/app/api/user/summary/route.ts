import { getUserIdFromRequest, ok } from "@/lib/api";
import { getEligibleNftTiers, getReferralStats, getUserSummary } from "@/lib/persistence";

export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request);
  return ok({
    userId,
    summary: await getUserSummary(userId),
    referrals: await getReferralStats(userId),
    nft: await getEligibleNftTiers(userId),
  });
}

