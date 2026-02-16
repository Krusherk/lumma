import { z } from "zod";

import { config } from "@/lib/config";
import { fail, getUserIdFromRequest, ok } from "@/lib/api";
import { enableReferralRewardsForUser, executeSwap, getSwapHistory, getUserSummary, recordPointEvent } from "@/lib/store";

const bodySchema = z.object({
  userId: z.string().optional(),
  from: z.enum(["USDC", "EURC"]),
  to: z.enum(["USDC", "EURC"]),
  amount: z.number().positive(),
  slippageBps: z.number().int().min(1).max(500).default(30),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const userId = body.userId ?? getUserIdFromRequest(request);
    const swapEvent = executeSwap(userId, body.from, body.to, body.amount);
    enableReferralRewardsForUser(userId);
    recordPointEvent(userId, "complete_swap");

    const summary = getUserSummary(userId);
    if (summary.swaps >= 50) {
      recordPointEvent(userId, "swaps_50");
    } else if (summary.swaps >= 10) {
      recordPointEvent(userId, "swaps_10");
    }

    return ok({
      swap: swapEvent,
      txPayload: {
        to: config.contracts.stableFxRouter || "0x0000000000000000000000000000000000000000",
        value: "0",
        data: "0x",
        chainId: config.chain.id,
        slippageBps: body.slippageBps,
      },
      history: getSwapHistory(userId),
      swapMilestoneProgress: `${summary.swaps}/250`,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to execute swap.", 400);
  }
}

