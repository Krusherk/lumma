import fs from "node:fs";
import path from "node:path";

import solc from "solc";
import { createPublicClient, createWalletClient, formatUnits, http, keccak256, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

type CompiledContract = {
  abi: unknown[];
  bytecode: `0x${string}`;
};

type SolcOutput = {
  contracts?: Record<string, Record<string, { abi: unknown[]; evm: { bytecode: { object: string } } }>>;
  errors?: Array<{ severity: string; formattedMessage: string }>;
};

const rootDir = path.resolve(process.cwd());
const contractsDir = path.join(rootDir, "contracts", "src");

const ARC_RPC_URL = process.env.NEXT_PUBLIC_ARC_RPC_URL ?? "https://rpc.testnet.arc.network";
const ARC_CHAIN_ID = Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID ?? "5042002");
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS ??
  "0x3600000000000000000000000000000000000000") as `0x${string}`;

if (!PRIVATE_KEY || !PRIVATE_KEY.startsWith("0x")) {
  throw new Error("Missing DEPLOYER_PRIVATE_KEY env var. Provide a 0x-prefixed private key.");
}

function readContract(relativePath: string) {
  return fs.readFileSync(path.join(contractsDir, relativePath), "utf8");
}

function findImports(importPath: string) {
  const candidates = [
    path.join(rootDir, importPath),
    path.join(rootDir, "contracts", importPath),
    path.join(rootDir, "node_modules", importPath),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return { contents: fs.readFileSync(candidate, "utf8") };
    }
  }
  return { error: `File not found: ${importPath}` };
}

function compileContracts() {
  const input = {
    language: "Solidity",
    sources: {
      "contracts/src/LummaVaultManager.sol": {
        content: readContract("LummaVaultManager.sol"),
      },
      "contracts/src/LummaMilestones.sol": {
        content: readContract("LummaMilestones.sol"),
      },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object"],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports })) as SolcOutput;
  if (output.errors?.length) {
    const errors = output.errors.filter((entry) => entry.severity === "error");
    if (errors.length) {
      throw new Error(errors.map((entry) => entry.formattedMessage).join("\n"));
    }
  }

  const vaultArtifact = output.contracts?.["contracts/src/LummaVaultManager.sol"]?.LummaVaultManager;
  const milestonesArtifact = output.contracts?.["contracts/src/LummaMilestones.sol"]?.LummaMilestones;
  if (!vaultArtifact || !milestonesArtifact) {
    throw new Error("Compilation output missing expected contracts.");
  }

  return {
    vaultManager: {
      abi: vaultArtifact.abi,
      bytecode: `0x${vaultArtifact.evm.bytecode.object}` as `0x${string}`,
    } satisfies CompiledContract,
    milestones: {
      abi: milestonesArtifact.abi,
      bytecode: `0x${milestonesArtifact.evm.bytecode.object}` as `0x${string}`,
    } satisfies CompiledContract,
  };
}

async function main() {
  const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
  const chain = {
    id: ARC_CHAIN_ID,
    name: "Arc Testnet",
    nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 6 },
    rpcUrls: {
      default: { http: [ARC_RPC_URL] },
      public: { http: [ARC_RPC_URL] },
    },
  };

  const publicClient = createPublicClient({
    chain,
    transport: http(ARC_RPC_URL),
  });
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(ARC_RPC_URL),
  });

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Deployer: ${account.address}`);
  console.log(`Balance: ${formatUnits(balance, 6)} USDC (native gas token)`);

  const { vaultManager, milestones } = compileContracts();

  console.log("Deploying LummaVaultManager...");
  const vaultTxHash = await walletClient.deployContract({
    abi: vaultManager.abi,
    bytecode: vaultManager.bytecode,
    args: [USDC_ADDRESS, account.address],
  });
  const vaultReceipt = await publicClient.waitForTransactionReceipt({ hash: vaultTxHash });
  if (!vaultReceipt.contractAddress) {
    throw new Error("Vault manager deployment returned no contract address.");
  }
  const vaultManagerAddress = vaultReceipt.contractAddress;
  console.log(`LummaVaultManager: ${vaultManagerAddress}`);

  console.log("Deploying LummaMilestones...");
  const milestonesTxHash = await walletClient.deployContract({
    abi: milestones.abi,
    bytecode: milestones.bytecode,
    args: [account.address],
  });
  const milestonesReceipt = await publicClient.waitForTransactionReceipt({ hash: milestonesTxHash });
  if (!milestonesReceipt.contractAddress) {
    throw new Error("Milestones deployment returned no contract address.");
  }
  const milestonesAddress = milestonesReceipt.contractAddress;
  console.log(`LummaMilestones: ${milestonesAddress}`);

  const txCap = BigInt("25000000000");
  const vaultIds = [
    { label: "vault-conservative", risk: 0 },
    { label: "vault-balanced", risk: 1 },
    { label: "vault-aggressive", risk: 2 },
  ] as const;

  for (const vault of vaultIds) {
    const vaultId = keccak256(toHex(vault.label));
    console.log(`Configuring ${vault.label} (${vaultId})...`);
    const txHash = await walletClient.writeContract({
      address: vaultManagerAddress,
      abi: vaultManager.abi,
      functionName: "configureVault",
      args: [vaultId, vault.risk, txCap],
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
  }

  console.log("");
  console.log("Deployment complete:");
  console.log(`NEXT_PUBLIC_VAULT_MANAGER_ADDRESS=${vaultManagerAddress}`);
  console.log(`NEXT_PUBLIC_MILESTONE_NFT_ADDRESS=${milestonesAddress}`);
  console.log(`NEXT_PUBLIC_USDC_ADDRESS=${USDC_ADDRESS}`);
  console.log("NEXT_PUBLIC_EURC_ADDRESS=0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a");
  console.log("NEXT_PUBLIC_STABLEFX_ROUTER_ADDRESS=0x1f91886C7028986aD885ffCee0e40b75C9cd5aC1");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
