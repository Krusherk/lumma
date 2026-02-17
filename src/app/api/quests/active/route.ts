import { getUserIdFromRequest, ok } from "@/lib/api";
import { getActiveQuests } from "@/lib/persistence";

export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request);
  return ok({
    userId,
    quests: await getActiveQuests(userId),
    timer: {
      resetsInHours: 168,
    },
  });
}

