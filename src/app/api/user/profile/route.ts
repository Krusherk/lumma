import { z } from "zod";

import { fail, getUserIdFromRequest, ok } from "@/lib/api";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { getOrCreateUser, getUserProfile, setUsername } from "@/lib/store";

const updateSchema = z.object({
  userId: z.string().optional(),
  username: z.string().trim().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  walletAddress: z.string().optional(),
});

function missingUsersTable(message?: string) {
  return message?.includes("public.users") ?? false;
}

export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request);
  const localUser = getUserProfile(userId);
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return ok(
      {
        userId,
        profile: {
          username: localUser.username ?? null,
          walletAddress: localUser.walletAddress ?? null,
          referralCode: localUser.referralCode,
        },
        source: "memory",
        warning: "Supabase service role key is missing; profile is in temporary memory mode.",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, username, wallet_address, referral_code")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (missingUsersTable(error.message)) {
      return ok(
        {
          userId,
          profile: {
            username: localUser.username ?? null,
            walletAddress: localUser.walletAddress ?? null,
            referralCode: localUser.referralCode,
          },
          source: "memory",
          warning: "Supabase schema is missing public.users. Run migrations 0001_initial.sql and 0002_usernames.sql.",
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    return fail("Failed to load user profile from Supabase.", 500, error.message);
  }

  return ok(
    {
      userId,
      profile: {
        username: data?.username ?? localUser.username ?? null,
        walletAddress: data?.wallet_address ?? localUser.walletAddress ?? null,
        referralCode: data?.referral_code ?? localUser.referralCode,
      },
      source: "supabase",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  try {
    const body = updateSchema.parse(await request.json());
    const userId = body.userId ?? getUserIdFromRequest(request);
    const user = getOrCreateUser(userId, body.walletAddress);
    const updated = setUsername(userId, body.username);
    const supabase = createSupabaseAdminClient();

    if (!supabase) {
      return ok(
        {
          userId,
          profile: {
            username: updated.username ?? null,
            walletAddress: updated.walletAddress ?? null,
            referralCode: updated.referralCode,
          },
          source: "memory",
          warning: "Supabase service role key is missing; username is only stored in memory.",
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const payload = {
      id: user.id,
      username: updated.username ?? null,
      wallet_address: body.walletAddress ?? user.walletAddress ?? null,
      referral_code: user.referralCode,
      points_settled: user.pointsSettled,
      points_pending: user.pointsPending,
      risk_flag: user.riskFlag,
    };

    const { data, error } = await supabase
      .from("users")
      .upsert(payload, { onConflict: "id" })
      .select("id, username, wallet_address, referral_code")
      .single();

    if (error) {
      if (missingUsersTable(error.message)) {
        return ok(
          {
            userId,
            profile: {
              username: updated.username ?? null,
              walletAddress: updated.walletAddress ?? null,
              referralCode: updated.referralCode,
            },
            source: "memory",
            warning: "Supabase schema is missing public.users. Run migrations 0001_initial.sql and 0002_usernames.sql.",
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
      return fail(
        "Failed to save profile to Supabase. Ensure users table has username column.",
        500,
        error.message,
      );
    }

    return ok(
      {
        userId,
        profile: {
          username: data.username,
          walletAddress: data.wallet_address,
          referralCode: data.referral_code,
        },
        source: "supabase",
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

