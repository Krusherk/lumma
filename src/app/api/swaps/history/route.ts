import { getUserIdFromRequest, ok } from "@/lib/api";
import { getSwapHistory } from "@/lib/store";

export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request);
  return ok({
    userId,
    history: getSwapHistory(userId),
  });
}

