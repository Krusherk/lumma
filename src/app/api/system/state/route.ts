import { ok } from "@/lib/api";
import { getSystemState } from "@/lib/persistence";

export async function GET() {
  return ok(await getSystemState());
}

