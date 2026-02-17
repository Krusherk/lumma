import { z } from "zod";

import { fail, ok } from "@/lib/api";
import { getOrCreateUser } from "@/lib/persistence";
import { verifyPrivyAccessToken } from "@/lib/privy";

const bodySchema = z.object({
  token: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const parsed = bodySchema.parse(await request.json());
    const verification = await verifyPrivyAccessToken(parsed.token);
    if (!verification.verified || !verification.userId) {
      return fail("Privy token verification failed.", 401, verification);
    }
    const user = await getOrCreateUser(verification.userId, verification.walletAddress);
    return ok({
      verified: true,
      userId: user.id,
      walletAddress: user.walletAddress,
      referralCode: user.referralCode,
      reason: verification.reason,
    });
  } catch (error) {
    return fail(
      "Invalid request for Privy verification.",
      400,
      error instanceof Error ? error.message : String(error),
    );
  }
}

