"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Blocks,
  FileCode2,
  Flame,
  Network,
  Shield,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useEffect } from "react";

const sections = [
  { id: "overview", label: "Overview" },
  { id: "architecture", label: "Architecture" },
  { id: "contracts", label: "Contracts" },
  { id: "functions", label: "Core Functions" },
  { id: "apy", label: "APY Model" },
  { id: "security", label: "Security" },
  { id: "integrate", label: "Integration" },
  { id: "ops", label: "Ops Runbook" },
];

const addresses = {
  chainId: "5042002",
  rpc: "https://rpc.testnet.arc.network",
  explorer: "https://testnet.arcscan.app",
  usdc: "0x3600000000000000000000000000000000000000",
  eurc: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
  stableFxRouter: "0x1f91886C7028986aD885ffCee0e40b75C9cd5aC1",
  vaultManager: "0xe40675fe67868d7c646110ca65c09a7f47f0cf54",
  milestones: "0x75f162947ed90906e5d0dbdac8ac10b97434bc99",
};

export default function DocsPage() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    const nodes = Array.from(document.querySelectorAll("[data-reveal]"));
    for (const node of nodes) {
      observer.observe(node);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#04070e] text-[#eceef2]">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="lumma-noir-grid opacity-90" />
      </div>
      <div className="mx-auto max-w-7xl px-3 py-6 sm:px-5 sm:py-8">
        <header className="lumma-reveal relative overflow-hidden border border-white/16 bg-[#050913] px-5 py-7" data-reveal>
          <div className="pointer-events-none absolute inset-0 lumma-scanlines opacity-65" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/62">
              Lumma Protocol Docs
            </p>
            <h1 className="mt-3 max-w-5xl font-display text-[clamp(2rem,6.6vw,4.8rem)] leading-[0.94] text-white">
              System documentation for a quest-native stablecoin utility protocol.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/70">
              Contracts, data rails, reward logic, and operational controls for Lumma on Arc testnet.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href="https://testnet.lumma.xyz"
                className="rounded-lg border border-lumma-sky/52 bg-lumma-sky/10 px-4 py-2 text-sm font-semibold text-lumma-sky transition hover:bg-lumma-sky/16"
              >
                Open Cockpit
              </a>
              <Link
                href="/"
                className="rounded-lg border border-white/24 px-4 py-2 text-sm font-semibold text-white/86 transition hover:bg-white/8"
              >
                Landing
              </Link>
              <a
                href="https://docs.arc.network/"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-white/24 px-4 py-2 text-sm font-semibold text-white/86 transition hover:bg-white/8"
              >
                Arc Docs <ArrowUpRight className="ml-1 inline" size={14} />
              </a>
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="lumma-reveal h-fit border border-white/14 bg-black/36 p-4 lg:sticky lg:top-5" data-reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/58">
              Navigation
            </p>
            <nav className="mt-3 flex flex-col gap-1.5">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="rounded-md border border-transparent px-2 py-1.5 text-sm text-white/84 transition hover:border-white/18 hover:bg-white/6"
                >
                  {section.label}
                </a>
              ))}
            </nav>
          </aside>

          <div className="space-y-5">
            <DocCard id="overview" title="Overview" icon={<Sparkles size={16} />}>
              <p>
                Lumma is a loop-based DeFi system: vault actions + stable swaps + validated incentive scoring.
              </p>
              <ul className="list-disc space-y-1 pl-5 text-white/74">
                <li>Arc-native gas model (USDC as native gas).</li>
                <li>Offchain anti-sybil scoring engine with settlement gates.</li>
                <li>Onchain milestone NFTs for durable reward states.</li>
              </ul>
            </DocCard>

            <DocCard id="architecture" title="Architecture" icon={<Blocks size={16} />}>
              <div className="grid gap-3 md:grid-cols-2">
                <MiniPanel title="Frontend">
                  Next.js host-routed surfaces:
                  <br />
                  `lumma.xyz` landing
                  <br />
                  `testnet.lumma.xyz` cockpit
                  <br />
                  `docs.lumma.xyz` docs
                </MiniPanel>
                <MiniPanel title="Execution Layer">
                  Vault manager + milestones contracts on Arc testnet and StableFX router integration.
                </MiniPanel>
                <MiniPanel title="Reward Layer">
                  Points, referrals, quests, and leaderboard snapshots in API + Supabase.
                </MiniPanel>
                <MiniPanel title="Control Layer">
                  Admin pause controls, anti-abuse flags, and scheduled settlement windows.
                </MiniPanel>
              </div>
            </DocCard>

            <DocCard id="contracts" title="Contract Registry" icon={<Network size={16} />}>
              <CodeBlock
                code={`Chain ID: ${addresses.chainId}
RPC: ${addresses.rpc}
Explorer: ${addresses.explorer}

USDC: ${addresses.usdc}
EURC: ${addresses.eurc}
StableFX Router: ${addresses.stableFxRouter}
LummaVaultManager: ${addresses.vaultManager}
LummaMilestones: ${addresses.milestones}`}
              />
              <ul className="list-disc pl-5 text-sm text-white/75">
                <li>
                  <a
                    href={`https://testnet.arcscan.app/address/${addresses.vaultManager}`}
                    className="underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    LummaVaultManager on Arcscan
                  </a>
                </li>
                <li>
                  <a
                    href={`https://testnet.arcscan.app/address/${addresses.milestones}`}
                    className="underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    LummaMilestones on Arcscan
                  </a>
                </li>
              </ul>
            </DocCard>

            <DocCard id="functions" title="Core Functions" icon={<FileCode2 size={16} />}>
              <h3 className="font-display text-xl font-semibold text-white">Vault Manager</h3>
              <CodeBlock
                code={`configureVault(bytes32 vaultId, uint8 risk, uint256 txCap)
setGlobalPause(bool paused)
setVaultPause(bytes32 vaultId, bool paused)
deposit(bytes32 vaultId, uint256 amount)
withdraw(bytes32 vaultId, uint256 amount)
getUserPosition(address user, bytes32 vaultId)`}
              />
              <h3 className="font-display text-xl font-semibold text-white">Milestones NFT</h3>
              <CodeBlock
                code={`claimMilestone(address account, string tier, string tokenUri)
setContractMetadataURI(string uri)
contractURI()
tokenURI(uint256 tokenId)`}
              />
            </DocCard>

            <DocCard id="apy" title="Estimated APY Model (Testnet)" icon={<Flame size={16} />}>
              <p>
                APY is modeled offchain for iteration speed and displayed explicitly as estimated.
              </p>
              <CodeBlock
                code={`estimated_apy = clamp(
  center + wave_drift + time_bucket_noise,
  vault.apy_min,
  vault.apy_max
)`}
              />
              <p className="text-sm text-white/74">
                Conservative: 5-8%, Balanced: 8-12%, Aggressive: 12-20%.
              </p>
            </DocCard>

            <DocCard id="security" title="Security Model" icon={<Shield size={16} />}>
              <ul className="list-disc space-y-1 pl-5 text-white/74">
                <li>Per-vault tx cap enforcement onchain.</li>
                <li>Global + per-vault pause switches for emergency controls.</li>
                <li>Anti-sybil scoring before social/referral settlement.</li>
                <li>Delayed social reward windows with block rules.</li>
              </ul>
            </DocCard>

            <DocCard id="integrate" title="Integration Quickstart" icon={<ArrowUpRight size={16} />}>
              <ol className="list-decimal space-y-1 pl-5 text-white/74">
                <li>Set Arc chain/RPC/explorer env vars.</li>
                <li>Configure Privy + Supabase keys.</li>
                <li>Set deployed contract addresses in env.</li>
                <li>Use Circle StableFX quotes with `CIRCLE_API_KEY`.</li>
                <li>Use `/api/*` routes for app flows and scoring events.</li>
              </ol>
            </DocCard>

            <DocCard id="ops" title="Ops Runbook" icon={<Wallet size={16} />}>
              <ul className="list-disc space-y-1 pl-5 text-white/74">
                <li>Pause rails with `POST /api/admin/vaults/pause` + admin token.</li>
                <li>Deploy contracts via `npm run deploy:arc`.</li>
                <li>Rotate compromised secrets before production activation.</li>
                <li>Verify DNS + TLS before launch messaging.</li>
              </ul>
            </DocCard>
          </div>
        </div>
      </div>
    </main>
  );
}

function DocCard({
  id,
  title,
  icon,
  children,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      data-reveal
      className="lumma-reveal relative overflow-hidden border border-white/14 bg-[#050913] p-5 text-sm text-white/86"
    >
      <div className="pointer-events-none absolute inset-0 lumma-scanlines opacity-45" />
      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="text-white/72">{icon}</span>
          <h2 className="font-display text-2xl font-semibold text-white">{title}</h2>
        </div>
        <div className="mt-3 space-y-3 leading-relaxed">{children}</div>
      </div>
    </section>
  );
}

function MiniPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="border border-white/14 bg-black/36 p-3 text-sm text-white/82">
      <p className="text-xs font-semibold uppercase tracking-[0.13em] text-white/56">{title}</p>
      <p className="mt-1 leading-relaxed">{children}</p>
    </article>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto border border-white/14 bg-black/44 p-4 text-xs text-[#d8f8ff]">
      <code>{code}</code>
    </pre>
  );
}
