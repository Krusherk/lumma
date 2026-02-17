import { getUserIdFromRequest, ok } from "@/lib/api";
import { getVaults } from "@/lib/persistence";

export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request);
  return ok({ userId, vaults: await getVaults(userId) });
}

