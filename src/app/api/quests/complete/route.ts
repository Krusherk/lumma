import { z } from "zod";

import { fail, getUserIdFromRequest, ok } from "@/lib/api";
import { completeQuest, getActiveQuests, getUserSummary } from "@/lib/persistence";

const bodySchema = z.object({
  userId: z.string().optional(),
  questId: z.string().min(1),
  proof: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const userId = body.userId ?? getUserIdFromRequest(request);
    const run = await completeQuest(userId, body.questId);
    return ok({
      run,
      quests: await getActiveQuests(userId),
      summary: await getUserSummary(userId),
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to complete quest.", 400);
  }
}

