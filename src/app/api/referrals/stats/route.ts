import { getUserIdFromRequest, ok } from "@/lib/api";
import { getReferralStats } from "@/lib/persistence";

export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request);
  return ok({
    userId,
    stats: await getReferralStats(userId),
  });
}

