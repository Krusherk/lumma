import { getUserIdFromRequest, ok } from "@/lib/api";
import { getActiveQuests } from "@/lib/store";

export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request);
  return ok({
    userId,
    quests: getActiveQuests(userId),
    timer: {
      resetsInHours: 168,
    },
  });
}

