import { fail, ok } from "@/lib/api";
import { quoteSwap } from "@/lib/store";

function parseAmount(value: string | null) {
  const amount = Number(value ?? "0");
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Query parameter 'amount' must be a positive number.");
  }
  return amount;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const from = (url.searchParams.get("from") ?? "USDC").toUpperCase();
    const to = (url.searchParams.get("to") ?? "EURC").toUpperCase();
    if (!["USDC", "EURC"].includes(from) || !["USDC", "EURC"].includes(to)) {
      return fail("Only USDC and EURC pairs are supported in v1.", 400);
    }
    const quote = quoteSwap(from as "USDC" | "EURC", to as "USDC" | "EURC", parseAmount(url.searchParams.get("amount")));
    return ok(quote);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to quote swap.", 400);
  }
}

