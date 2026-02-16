import { z } from "zod";

import { config } from "@/lib/config";
import { fail, getUserIdFromRequest, ok } from "@/lib/api";
import { claimMilestoneNft, getEligibleNftTiers } from "@/lib/store";
import type { NftTier } from "@/lib/types";

const bodySchema = z.object({
  userId: z.string().optional(),
  tier: z.enum(["bronze", "silver", "gold", "diamond", "special"]),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const userId = body.userId ?? getUserIdFromRequest(request);
    const claim = claimMilestoneNft(userId, body.tier as NftTier);
    return ok({
      claim,
      mintPayload: {
        contract: config.contracts.milestoneNft || "0x0000000000000000000000000000000000000000",
        method: "claimMilestone(address,string)",
        args: [userId, body.tier],
      },
      eligibility: getEligibleNftTiers(userId),
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to claim NFT.", 400);
  }
}

