import { z } from "zod";
import { encodeFunctionData, isAddress, keccak256, parseUnits, toHex } from "viem";

import { config } from "@/lib/config";
import { fail, getUserIdFromRequest, ok } from "@/lib/api";
import { getVaults, withdrawFromVault } from "@/lib/store";
import type { TxPayload } from "@/lib/tx";

const bodySchema = z.object({
  userId: z.string().optional(),
  vaultId: z.string().min(1),
  amount: z.number().positive(),
});

const vaultManagerAbi = [
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [
      { name: "vaultId", type: "bytes32" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

function getConfiguredAddress(value: string, label: string): `0x${string}` {
  if (!isAddress(value)) {
    throw new Error(`${label} contract address is not configured.`);
  }
  return value;
}

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const userId = body.userId ?? getUserIdFromRequest(request);
    withdrawFromVault(userId, body.vaultId, body.amount);

    const vaultManagerAddress = getConfiguredAddress(
      config.contracts.vaultManager,
      "Vault manager",
    );
    const amountUnits = parseUnits(body.amount.toString(), 6);
    const vaultHash = keccak256(toHex(body.vaultId));
    const txPayload: TxPayload = {
      chainId: config.chain.id,
      mode: "onchain",
      steps: [
        {
          label: "Withdraw",
          to: vaultManagerAddress,
          value: "0x0",
          data: encodeFunctionData({
            abi: vaultManagerAbi,
            functionName: "withdraw",
            args: [vaultHash, amountUnits],
          }),
        },
      ],
    };

    return ok({
      message: "Withdrawal accepted.",
      txPayload,
      vaults: getVaults(userId),
    });
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Failed to withdraw from vault.",
      400,
    );
  }
}

