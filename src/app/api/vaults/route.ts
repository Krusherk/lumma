import { getUserIdFromRequest, ok } from "@/lib/api";
import { getVaults } from "@/lib/store";

export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request);
  return ok({ userId, vaults: getVaults(userId) });
}

