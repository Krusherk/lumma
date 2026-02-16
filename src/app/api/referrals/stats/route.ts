import { getUserIdFromRequest, ok } from "@/lib/api";
import { getReferralStats } from "@/lib/store";

export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request);
  return ok({
    userId,
    stats: getReferralStats(userId),
  });
}

