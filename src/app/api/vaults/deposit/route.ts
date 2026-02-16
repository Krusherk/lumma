import { z } from "zod";

import { fail, getUserIdFromRequest, ok } from "@/lib/api";
import { depositToVault, enableReferralRewardsForUser, getVaults, recordPointEvent } from "@/lib/store";

const bodySchema = z.object({
  userId: z.string().optional(),
  vaultId: z.string().min(1),
  amount: z.number().positive(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const userId = body.userId ?? getUserIdFromRequest(request);
    depositToVault(userId, body.vaultId, body.amount);
    enableReferralRewardsForUser(userId);
    if (body.amount >= 1000) {
      recordPointEvent(userId, "deposit_1000");
    } else if (body.amount >= 100) {
      recordPointEvent(userId, "deposit_100");
    }
    recordPointEvent(userId, "first_deposit");
    return ok({
      message: "Deposit accepted.",
      txPayload: {
        action: "deposit",
        vaultId: body.vaultId,
        amount: body.amount,
      },
      vaults: getVaults(userId),
    });
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Failed to deposit into vault.",
      400,
    );
  }
}

