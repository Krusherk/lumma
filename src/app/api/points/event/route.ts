import { z } from "zod";

import { fail, getUserIdFromRequest, ok } from "@/lib/api";
import { getUserSummary, recordPointEvent } from "@/lib/persistence";

const bodySchema = z.object({
  userId: z.string().optional(),
  taskKey: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const userId = body.userId ?? getUserIdFromRequest(request);
    const event = await recordPointEvent(userId, body.taskKey, body.metadata ?? {});
    return ok({
      event,
      summary: await getUserSummary(userId),
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to append point event.", 400);
  }
}

