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

async function circleRequest<T>(path: string, body: Record<string, unknown>, apiKey: string, baseUrl: string) {
  const endpoint = `${baseUrl}${path}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const text = await response.text();
  const payload = text ? (JSON.parse(text) as T) : ({} as T);
  return { response, payload, endpoint };
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
    if (circleApiKey) {
      const baseUrl = normalizeBaseUrl(
        (process.env.CIRCLE_API_BASE_URL ?? "https://api.circle.com").trim(),
      );
      const { response, payload, endpoint } = await circleRequest<CircleQuotePayload>(
        "/v1/exchange/stablefx/quotes",
        {
          from: { currency: from, amount: amount.toFixed(2) },
          to: { currency: to },
          tenor: "instant",
        },
        circleApiKey,
        baseUrl,
      );
      if (response.ok && payload.id) {
        const rate = Number(payload.rate ?? quote.rate);
        const outAmount = Number(payload.to?.amount ?? quote.outAmount);
        return ok({
          ...quote,
          rate,
          outAmount,
          mode: "circle",
          source: "circle_stablefx",
          circleQuoteId: payload.id,
          circleQuote: {
            id: payload.id,
            rate,
            fromAmount: Number(payload.from?.amount ?? amount),
            toAmount: outAmount,
            feeAmount: Number(payload.fee?.amount ?? 0),
            expiresAt: payload.expiresAt ?? payload.expiry ?? null,
            endpoint,
          },
        });
      }
      return ok({
        ...quote,
        mode: "simulation",
        warning: `Circle StableFX quote failed (${response.status}): ${payload.message ?? payload.error ?? "Unknown error"}. Falling back to simulation quote.`,
      });
    }

    return ok({
      ...quote,
      mode: "simulation",
      warning: "Set CIRCLE_API_KEY to use official StableFX quotes from Circle.",
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to quote swap.", 400);
  }
}

