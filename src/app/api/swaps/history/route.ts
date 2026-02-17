import { getUserIdFromRequest, ok } from "@/lib/api";
import { getSwapHistory } from "@/lib/persistence";

export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request);
  return ok({
    userId,
    history: await getSwapHistory(userId),
  });
}

