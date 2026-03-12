import crypto from "node:crypto";
import { z } from "zod";
import { encodeAbiParameters, isAddress, parseUnits } from "viem";

import { config } from "@/lib/config";
import { fail, getUserIdFromRequest, ok } from "@/lib/api";
import {
  enableReferralRewardsForUser,
  executeSwap,
  getSwapHistory,
  getUserSummary,
  recordPointEvent,
} from "@/lib/persistence";
import type { TxPayload } from "@/lib/tx";

const bodySchema = z.object({
  userId: z.string().optional(),
  from: z.enum(["USDC", "EURC"]),
  to: z.enum(["USDC", "EURC"]),
  amount: z.number().positive(),
  slippageBps: z.number().int().min(1).max(500).default(30),
  quote: z
    .object({
      minOut: z.number().positive(),
      fee: z.number().nonnegative().default(0),
      expiresAt: z.number().int().positive(),
      signature: z.string().regex(/^0x[0-9a-fA-F]+$/),
    })
    .optional(),
  circle: z
    .object({
      stage: z.enum(["trade", "trade_signature", "funding_submit"]).default("trade"),
      quoteId: z.string().optional(),
      tradeId: z.string().optional(),
      contractTradeId: z.string().optional(),
      recipientAddress: z.string().optional(),
      signature: z.string().regex(/^0x[0-9a-fA-F]+$/).optional(),
      typedData: z.any().optional(),
      rate: z.number().optional(),
      outAmount: z.number().optional(),
    })
    .optional(),
});

const stableFxSwapSelector = "0xcd274f98";
const circleBaseUrl = (process.env.CIRCLE_API_BASE_URL ?? "https://api.circle.com").replace(/\/+$/, "");

async function circleRequest<T>(
  path: string,
  init: { method?: string; body?: Record<string, unknown> },
  apiKey: string,
) {
  const response = await fetch(`${circleBaseUrl}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const text = await response.text();
  const payload = text ? (JSON.parse(text) as T) : ({} as T);
  return { response, payload };
}

function stableAddressFor(symbol: "USDC" | "EURC") {
  const value = symbol === "USDC" ? config.contracts.usdc : config.contracts.eurc;
  if (!isAddress(value)) {
    throw new Error(`${symbol} address is not configured.`);
  }
  return value;
}

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const userId = body.userId ?? getUserIdFromRequest(request);
    const circleApiKey = process.env.CIRCLE_API_KEY;
    if (body.circle) {
      if (!circleApiKey) {
        return fail("CIRCLE_API_KEY is required for Circle StableFX execution.", 400);
      }

      const stage = body.circle.stage ?? "trade";
      if (stage === "trade") {
        if (!body.circle.quoteId || !body.circle.recipientAddress) {
          return fail("Missing Circle quoteId or recipientAddress.", 400);
        }
        const idempotencyKey = crypto.randomUUID();
        const { response: tradeRes, payload: tradePayload } = await circleRequest<{
          id?: string;
          rate?: string | number;
          from?: { amount?: string };
          to?: { amount?: string };
          status?: string;
          message?: string;
          error?: string;
        }>(
          "/v1/exchange/stablefx/trades",
          {
            method: "POST",
            body: { quoteId: body.circle.quoteId, idempotencyKey },
          },
          circleApiKey,
        );
        if (!tradeRes.ok || !tradePayload.id) {
          return fail(tradePayload.message ?? tradePayload.error ?? "Failed to create Circle trade.", 400);
        }

        const { response: presignRes, payload: presignPayload } = await circleRequest<{
          typedData?: Record<string, unknown>;
          message?: string;
          error?: string;
        }>(
          `/v1/exchange/stablefx/signatures/presign/taker/${tradePayload.id}?recipientAddress=${body.circle.recipientAddress}`,
          {},
          circleApiKey,
        );
        if (!presignRes.ok || !presignPayload.typedData) {
          return fail(presignPayload.message ?? presignPayload.error ?? "Failed to get trade presign data.", 400);
        }
        return ok({
          circle: {
            stage: "trade_signature",
            tradeId: tradePayload.id,
            recipientAddress: body.circle.recipientAddress,
            tradeSignatureTypedData: presignPayload.typedData,
            trade: tradePayload,
          },
        });
      }

      if (stage === "trade_signature") {
        if (!body.circle.tradeId || !body.circle.signature || !body.circle.typedData || !body.circle.recipientAddress) {
          return fail("Missing tradeId, signature, typedData, or recipientAddress.", 400);
        }

        const typedData = body.circle.typedData as { message?: Record<string, unknown> };
        const details = typedData.message ?? {};
        const { response: sigRes, payload: sigPayload } = await circleRequest<{
          id?: string;
          status?: string;
          message?: string;
          error?: string;
        }>(
          "/v1/exchange/stablefx/signatures",
          {
            method: "POST",
            body: {
              type: "taker",
              tradeId: body.circle.tradeId,
              address: body.circle.recipientAddress,
              details,
              signature: body.circle.signature,
            },
          },
          circleApiKey,
        );
        if (!sigRes.ok) {
          return fail(sigPayload.message ?? sigPayload.error ?? "Failed to register trade signature.", 400);
        }

        const { response: tradeStatusRes, payload: tradeStatus } = await circleRequest<{
          contractTradeId?: string;
          status?: string;
          rate?: string | number;
          from?: { amount?: string };
          to?: { amount?: string };
          message?: string;
          error?: string;
        }>(
          `/v1/exchange/stablefx/trades/${body.circle.tradeId}?type=taker&status=pending_settlement`,
          {},
          circleApiKey,
        );
        if (!tradeStatusRes.ok || !tradeStatus.contractTradeId) {
          return ok({
            circle: {
              stage: "trade_signature",
              tradeId: body.circle.tradeId,
              status: tradeStatus.status ?? "pending",
              message: tradeStatus.message ?? tradeStatus.error ?? "Trade not ready for funding yet.",
            },
          });
        }

        const { response: fundingRes, payload: fundingPayload } = await circleRequest<{
          typedData?: Record<string, unknown>;
          message?: string;
          error?: string;
        }>(
          "/v1/exchange/stablefx/signatures/funding/presign",
          {
            method: "POST",
            body: { contractTradeIds: [tradeStatus.contractTradeId], type: "taker" },
          },
          circleApiKey,
        );
        if (!fundingRes.ok || !fundingPayload.typedData) {
          return fail(fundingPayload.message ?? fundingPayload.error ?? "Failed to get funding presign data.", 400);
        }

        return ok({
          circle: {
            stage: "funding_submit",
            tradeId: body.circle.tradeId,
            contractTradeId: tradeStatus.contractTradeId,
            fundingTypedData: fundingPayload.typedData,
            trade: tradeStatus,
          },
        });
      }

      if (stage === "funding_submit") {
        if (!body.circle.contractTradeId || !body.circle.signature || !body.circle.typedData) {
          return fail("Missing contractTradeId, signature, or typedData for funding.", 400);
        }
        const typedData = body.circle.typedData as { message?: Record<string, unknown> };
        const permit2 = typedData.message ?? {};

        const { response: fundRes, payload: fundPayload } = await circleRequest<{
          id?: string;
          status?: string;
          message?: string;
          error?: string;
        }>(
          "/v1/exchange/stablefx/fund",
          {
            method: "POST",
            body: {
              type: "taker",
              signature: body.circle.signature,
              permit2,
            },
          },
          circleApiKey,
        );
        if (!fundRes.ok) {
          return fail(fundPayload.message ?? fundPayload.error ?? "Funding submission failed.", 400);
        }

        const rate = Number(body.circle.rate ?? 1);
        const outAmount = Number(body.circle.outAmount ?? body.amount);
        const swapEvent = await executeSwap(userId, body.from, body.to, body.amount, { rate, outAmount });
        await enableReferralRewardsForUser(userId);
        await recordPointEvent(userId, "complete_swap");
        const summary = await getUserSummary(userId);
        if (summary.swaps >= 50) {
          await recordPointEvent(userId, "swaps_50");
        } else if (summary.swaps >= 10) {
          await recordPointEvent(userId, "swaps_10");
        }

        const txPayload: TxPayload = {
          chainId: config.chain.id,
          mode: "simulation",
          steps: [],
          note: "Circle StableFX funding submitted. Settlement will finalize onchain.",
        };

        return ok({
          swap: swapEvent,
          txPayload,
          circle: {
            stage: "completed",
            contractTradeId: body.circle.contractTradeId,
            status: fundPayload.status ?? "submitted",
          },
          history: await getSwapHistory(userId),
          swapMilestoneProgress: `${summary.swaps}/250`,
        });
      }
    }

    const swapEvent = await executeSwap(userId, body.from, body.to, body.amount);
    await enableReferralRewardsForUser(userId);
    await recordPointEvent(userId, "complete_swap");

    const summary = await getUserSummary(userId);
    if (summary.swaps >= 50) {
      await recordPointEvent(userId, "swaps_50");
    } else if (summary.swaps >= 10) {
      await recordPointEvent(userId, "swaps_10");
    }
    const stableFxRouter = config.contracts.stableFxRouter;
    let txPayload: TxPayload;
    if (body.quote && isAddress(stableFxRouter)) {
      const argsData = encodeAbiParameters(
        [
          { type: "address" },
          { type: "address" },
          { type: "uint256" },
          { type: "uint256" },
          { type: "uint256" },
          { type: "uint256" },
          { type: "bytes" },
        ],
        [
          stableAddressFor(body.from),
          stableAddressFor(body.to),
          parseUnits(body.amount.toString(), 6),
          parseUnits(body.quote.minOut.toString(), 6),
          parseUnits(body.quote.fee.toString(), 6),
          BigInt(body.quote.expiresAt),
          body.quote.signature as `0x${string}`,
        ],
      );
      txPayload = {
        chainId: config.chain.id,
        mode: "onchain",
        steps: [
          {
            label: "StableFX Swap",
            to: stableFxRouter,
            value: "0x0",
            data: `${stableFxSwapSelector}${argsData.slice(2)}` as `0x${string}`,
          },
        ],
      };
    } else {
      txPayload = {
        chainId: config.chain.id,
        mode: "simulation",
        steps: [],
        note: "Swap recorded. Add quote payload (minOut, fee, expiresAt, signature) to submit onchain StableFX tx.",
      };
    }

    return ok({
      swap: swapEvent,
      txPayload,
      history: await getSwapHistory(userId),
      swapMilestoneProgress: `${summary.swaps}/250`,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to execute swap.", 400);
  }
}

