import { z } from "zod";

import { fail, getUserIdFromRequest, ok } from "@/lib/api";
import { getOrCreateUser, getUserProfile, setUsername } from "@/lib/persistence";
import { createSupabaseAdminClient } from "@/lib/supabase";

const updateSchema = z.object({
  userId: z.string().optional(),
  username: z.string().trim().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  walletAddress: z.string().optional(),
});

export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request);
  try {
    const profile = await getUserProfile(userId);
    const source = createSupabaseAdminClient() ? "supabase" : "memory";
    return ok(
      {
        userId,
        profile: {
          username: profile.username ?? null,
          walletAddress: profile.walletAddress ?? null,
          referralCode: profile.referralCode,
        },
        source,
        warning:
          source === "memory"
            ? "Supabase service role key is missing; profile is in temporary memory mode."
            : undefined,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Failed to load user profile.",
      500,
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = updateSchema.parse(await request.json());
    const userId = body.userId ?? getUserIdFromRequest(request);
    await getOrCreateUser(userId, body.walletAddress);
    const updated = await setUsername(userId, body.username, body.walletAddress);
    const source = createSupabaseAdminClient() ? "supabase" : "memory";
    return ok(
      {
        userId,
        profile: {
          username: updated.username ?? null,
          walletAddress: updated.walletAddress ?? null,
          referralCode: updated.referralCode,
        },
        source,
        warning:
          source === "memory"
            ? "Supabase service role key is missing; username is only stored in memory."
            : undefined,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Invalid profile update request.",
      400,
    );
  }
}

