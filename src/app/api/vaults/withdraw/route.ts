import { z } from "zod";

import { fail, getUserIdFromRequest, ok } from "@/lib/api";
import { getVaults, withdrawFromVault } from "@/lib/store";

const bodySchema = z.object({
  userId: z.string().optional(),
  vaultId: z.string().min(1),
  amount: z.number().positive(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const userId = body.userId ?? getUserIdFromRequest(request);
    withdrawFromVault(userId, body.vaultId, body.amount);
    return ok({
      message: "Withdrawal accepted.",
      txPayload: {
        action: "withdraw",
        vaultId: body.vaultId,
        amount: body.amount,
      },
      vaults: getVaults(userId),
    });
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Failed to withdraw from vault.",
      400,
    );
  }
}

