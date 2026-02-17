import { z } from "zod";

import { fail, getUserIdFromRequest, ok } from "@/lib/api";
import { applyReferralCode, getReferralStats } from "@/lib/persistence";

const bodySchema = z.object({
  userId: z.string().optional(),
  code: z.string().min(4),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const userId = body.userId ?? getUserIdFromRequest(request);
    const result = await applyReferralCode(userId, body.code.toUpperCase().trim());
    return ok({
      applied: true,
      ...result,
      stats: await getReferralStats(userId),
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to apply referral code.", 400);
  }
}

