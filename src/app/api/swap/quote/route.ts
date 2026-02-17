import { fail, ok } from "@/lib/api";
import { quoteSwap } from "@/lib/persistence";

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
    const amount = parseAmount(url.searchParams.get("amount"));
    const quote = await quoteSwap(
      from as "USDC" | "EURC",
      to as "USDC" | "EURC",
      amount,
    );
    const providerUrl = process.env.STABLEFX_QUOTE_API_URL;
    if (!providerUrl) {
      return ok({
        ...quote,
        mode: "simulation",
      });
    }

    const response = await fetch(providerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        amount,
      }),
      cache: "no-store",
    });
    const payload = (await response.json()) as {
      minOut?: number;
      fee?: number;
      expiresAt?: number;
      signature?: string;
      [key: string]: unknown;
    };
    if (!response.ok || !payload.signature || !payload.expiresAt || !payload.minOut) {
      return ok({
        ...quote,
        mode: "simulation",
        warning: "StableFX quote provider unavailable. Falling back to simulation quote.",
      });
    }
    return ok({
      ...quote,
      mode: "onchain",
      quote: {
        minOut: Number(payload.minOut),
        fee: Number(payload.fee ?? 0),
        expiresAt: Number(payload.expiresAt),
        signature: String(payload.signature),
      },
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to quote swap.", 400);
  }
}

