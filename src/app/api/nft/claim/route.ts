import { z } from "zod";
import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  http,
  isAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { config } from "@/lib/config";
import { fail, getUserIdFromRequest, ok } from "@/lib/api";
import { claimMilestoneNft, getEligibleNftTiers, getUserProfile } from "@/lib/persistence";
import type { NftTier } from "@/lib/types";
import type { TxPayload } from "@/lib/tx";

const bodySchema = z.object({
  userId: z.string().optional(),
  tier: z.enum(["bronze", "silver", "gold", "diamond", "special"]),
});

const milestonesAbi = [
  {
    type: "function",
    name: "claimMilestone",
    stateMutability: "nonpayable",
    inputs: [
      { name: "account", type: "address" },
      { name: "tier", type: "string" },
      { name: "tokenUri", type: "string" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    type: "event",
    name: "MilestoneClaimed",
    inputs: [
      { indexed: true, name: "account", type: "address" },
      { indexed: true, name: "tier", type: "bytes32" },
      { indexed: false, name: "tokenId", type: "uint256" },
    ],
  },
] as const;

function normalizePrivateKey(value?: string) {
  if (!value) {
    return null;
  }
  return value.startsWith("0x") ? (value as `0x${string}`) : (`0x${value}` as `0x${string}`);
}

function getNftTokenUri(tier: string) {
  const base = process.env.NFT_METADATA_BASE_URI ?? "https://docs.lumma.xyz/metadata";
  return `${base.replace(/\/$/, "")}/${tier}.json`;
}

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const userId = body.userId ?? getUserIdFromRequest(request);
    const profile = await getUserProfile(userId);
    if (!profile.walletAddress || !isAddress(profile.walletAddress)) {
      throw new Error("User wallet address is required before claiming NFT.");
    }

    const milestoneAddress = config.contracts.milestoneNft;
    if (!isAddress(milestoneAddress)) {
      throw new Error("Milestone NFT contract address is not configured.");
    }
    const deployerKey = normalizePrivateKey(process.env.DEPLOYER_PRIVATE_KEY);
    if (!deployerKey) {
      throw new Error("DEPLOYER_PRIVATE_KEY is required for owner-gated NFT minting.");
    }

    const account = privateKeyToAccount(deployerKey);
    const chain = {
      id: config.chain.id,
      name: "Arc Testnet",
      nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 6 },
      rpcUrls: {
        default: { http: [config.chain.rpcUrl] },
        public: { http: [config.chain.rpcUrl] },
      },
    };
    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(config.chain.rpcUrl),
    });
    const publicClient = createPublicClient({
      chain,
      transport: http(config.chain.rpcUrl),
    });

    const hash = await walletClient.writeContract({
      address: milestoneAddress,
      abi: milestonesAbi,
      functionName: "claimMilestone",
      args: [profile.walletAddress, body.tier, getNftTokenUri(body.tier)],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    let tokenId: number | undefined;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: milestonesAbi,
          data: log.data,
          topics: log.topics,
          eventName: "MilestoneClaimed",
        });
        tokenId = Number(decoded.args.tokenId);
      } catch {
        // ignore non-matching logs
      }
    }
    const claim = await claimMilestoneNft(userId, body.tier as NftTier, {
      txHash: hash,
      tokenId,
    });
    const txPayload: TxPayload = {
      chainId: config.chain.id,
      mode: "onchain",
      steps: [],
      note: `Mint submitted by owner signer: ${hash}`,
    };

    return ok({
      claim,
      txPayload,
      eligibility: await getEligibleNftTiers(userId),
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to claim NFT.", 400);
  }
}

