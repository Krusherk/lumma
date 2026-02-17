import { z } from "zod";

import { fail, ok } from "@/lib/api";
import { getSystemState, setVaultPause } from "@/lib/persistence";

const bodySchema = z.object({
  paused: z.boolean(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const token = request.headers.get("x-admin-token") ?? "";
    const paused = await setVaultPause(body.paused, token);
    return ok({
      paused,
      system: await getSystemState(),
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to update pause state.", 401);
  }
}

