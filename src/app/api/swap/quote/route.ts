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
    const customProviderUrl = process.env.STABLEFX_QUOTE_API_URL;
    if (customProviderUrl) {
      const response = await fetch(customProviderUrl, {
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
          warning: "Custom quote provider unavailable. Falling back to simulation quote.",
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
    }

    const circleApiKey = process.env.CIRCLE_API_KEY;
    if (!circleApiKey) {
      return ok({
        ...quote,
        mode: "simulation",
        warning: "Set CIRCLE_API_KEY to use official StableFX quotes from Circle.",
      });
    }

    const circleResponse = await fetch("https://api.circle.com/v1/exchange/stablefx/quotes", {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${circleApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: { currency: from, amount: amount.toFixed(2) },
        to: { currency: to },
        tenor: "instant",
      }),
      cache: "no-store",
    });
    const circlePayload = (await circleResponse.json()) as {
      id?: string;
      rate?: string;
      from?: { amount?: string; currency?: string };
      to?: { amount?: string; currency?: string };
      fee?: { amount?: string; currency?: string };
      expiry?: string;
      [key: string]: unknown;
    };
    if (!circleResponse.ok || !circlePayload.id) {
      return ok({
        ...quote,
        mode: "simulation",
        warning: "Circle StableFX quote request failed. Falling back to simulation quote.",
      });
    }

    return ok({
      ...quote,
      mode: "simulation",
      source: "circle_stablefx",
      circleQuote: {
        id: circlePayload.id,
        rate: Number(circlePayload.rate ?? quote.rate),
        toAmount: Number(circlePayload.to?.amount ?? quote.outAmount),
        feeAmount: Number(circlePayload.fee?.amount ?? 0),
        expiresAt: circlePayload.expiry ?? null,
      },
      warning:
        "Quote is fetched from Circle StableFX. Full onchain settlement path requires trade signature + funding signature flow.",
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to quote swap.", 400);
  }
}

