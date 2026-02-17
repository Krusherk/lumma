import { z } from "zod";
import { encodeFunctionData, isAddress, keccak256, parseUnits, toHex } from "viem";

import { config } from "@/lib/config";
import { fail, getUserIdFromRequest, ok } from "@/lib/api";
import { depositToVault, enableReferralRewardsForUser, getVaults, recordPointEvent } from "@/lib/store";
import type { TxPayload } from "@/lib/tx";

const bodySchema = z.object({
  userId: z.string().optional(),
  vaultId: z.string().min(1),
  amount: z.number().positive(),
});

const erc20ApproveAbi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const vaultManagerAbi = [
  {
    type: "function",
    name: "deposit",
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
    depositToVault(userId, body.vaultId, body.amount);
    enableReferralRewardsForUser(userId);
    if (body.amount >= 1000) {
      recordPointEvent(userId, "deposit_1000");
    } else if (body.amount >= 100) {
      recordPointEvent(userId, "deposit_100");
    }
    recordPointEvent(userId, "first_deposit");

    const vaultManagerAddress = getConfiguredAddress(
      config.contracts.vaultManager,
      "Vault manager",
    );
    const usdcAddress = getConfiguredAddress(config.contracts.usdc, "USDC");
    const amountUnits = parseUnits(body.amount.toString(), 6);
    const vaultHash = keccak256(toHex(body.vaultId));
    const txPayload: TxPayload = {
      chainId: config.chain.id,
      mode: "onchain",
      steps: [
        {
          label: "Approve USDC",
          to: usdcAddress,
          value: "0x0",
          data: encodeFunctionData({
            abi: erc20ApproveAbi,
            functionName: "approve",
            args: [vaultManagerAddress, amountUnits],
          }),
        },
        {
          label: "Deposit",
          to: vaultManagerAddress,
          value: "0x0",
          data: encodeFunctionData({
            abi: vaultManagerAbi,
            functionName: "deposit",
            args: [vaultHash, amountUnits],
          }),
        },
      ],
    };

    return ok({
      message: "Deposit accepted.",
      txPayload,
      vaults: getVaults(userId),
    });
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Failed to deposit into vault.",
      400,
    );
  }
}

