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
});

const stableFxSwapSelector = "0xcd274f98";

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

