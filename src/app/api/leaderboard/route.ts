import type { LeaderboardPeriod } from "@/lib/types";
import { fail, ok } from "@/lib/api";
import { getLeaderboard } from "@/lib/persistence";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const period = (url.searchParams.get("period") ?? "weekly") as LeaderboardPeriod;
  if (!["weekly", "monthly", "all_time"].includes(period)) {
    return fail("Invalid leaderboard period. Use weekly, monthly, or all_time.", 400);
  }
  return ok({
    period,
    rows: await getLeaderboard(period),
  });
}

