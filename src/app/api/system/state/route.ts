import { ok } from "@/lib/api";
import { getSystemState } from "@/lib/store";

export async function GET() {
  return ok(getSystemState());
}

