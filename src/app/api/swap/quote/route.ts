import { fail, ok } from "@/lib/api";
import { quoteSwap } from "@/lib/persistence";

type CircleQuotePayload = {
  id?: string;
  rate?: string | number;
  from?: { amount?: string; currency?: string };
  to?: { amount?: string; currency?: string };
  fee?: { amount?: string; currency?: string };
  expiresAt?: string;
  expiry?: string;
  message?: string;
  error?: string;
  code?: string | number;
  [key: string]: unknown;
};

function parseAmount(value: string | null) {
  const amount = Number(value ?? "0");
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Query parameter 'amount' must be a positive number.");
  }
  return amount;
}

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, "");
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

    const configuredBase = process.env.CIRCLE_API_BASE_URL?.trim();
    const baseUrls = configuredBase
      ? [normalizeBaseUrl(configuredBase)]
      : ["https://api.circle.com", "https://api-sandbox.circle.com"];
    const quotePaths = ["/v1/exchange/stablefx/quotes", "/v1/stablefx/quotes"];
    const attempts: Array<{ url: string; status?: number; code?: string | number; message?: string }> = [];

    for (const baseUrl of baseUrls) {
      for (const path of quotePaths) {
        const endpoint = `${baseUrl}${path}`;
        try {
          const circleResponse = await fetch(endpoint, {
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

          const text = await circleResponse.text();
          const circlePayload = text ? (JSON.parse(text) as CircleQuotePayload) : ({} as CircleQuotePayload);
          if (circleResponse.ok && circlePayload.id) {
            return ok({
              ...quote,
              mode: "simulation",
              source: "circle_stablefx",
              circleQuote: {
                id: circlePayload.id,
                rate: Number(circlePayload.rate ?? quote.rate),
                toAmount: Number(circlePayload.to?.amount ?? quote.outAmount),
                feeAmount: Number(circlePayload.fee?.amount ?? 0),
                expiresAt: circlePayload.expiresAt ?? circlePayload.expiry ?? null,
                endpoint,
              },
              warning:
                "Quote is fetched from Circle StableFX. Full onchain settlement path requires trade signature + funding signature flow.",
            });
          }

          attempts.push({
            url: endpoint,
            status: circleResponse.status,
            code: circlePayload.code,
            message: circlePayload.message ?? circlePayload.error ?? "Unknown Circle API error.",
          });
        } catch (error) {
          attempts.push({
            url: endpoint,
            message: error instanceof Error ? error.message : "Network error contacting Circle.",
          });
        }
      }
    }

    const topAttempt = attempts[0];
    return ok({
      ...quote,
      mode: "simulation",
      warning: topAttempt
        ? `Circle StableFX quote request failed (${topAttempt.status ?? "network"}${
            topAttempt.code ? `/${topAttempt.code}` : ""
          }): ${topAttempt.message ?? "Unknown error"}. Falling back to simulation quote.`
        : "Circle StableFX quote request failed. Falling back to simulation quote.",
      circleDebug: attempts.slice(0, 3),
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to quote swap.", 400);
  }
}

