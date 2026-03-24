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
  Wrench,
} from "lucide-react";
import { useEffect } from "react";

const sections = [
  { id: "overview", label: "Overview" },
  { id: "features", label: "Core Features" },
  { id: "architecture", label: "Architecture" },
  { id: "contracts", label: "Contract Registry" },
  { id: "api", label: "API Map" },
  { id: "deploy", label: "Deploy Runbook" },
  { id: "ops", label: "Ops" },
  { id: "troubleshoot", label: "Troubleshooting" },
];

const addresses = {
  chainId: process.env.NEXT_PUBLIC_ARC_CHAIN_ID ?? "5042002",
  rpc: process.env.NEXT_PUBLIC_ARC_RPC_URL ?? "https://rpc.testnet.arc.network",
  explorer: process.env.NEXT_PUBLIC_ARC_EXPLORER_URL ?? "https://testnet.arcscan.app",
  usdc:
    process.env.NEXT_PUBLIC_ARC_USDC_ADDRESS ??
    process.env.NEXT_PUBLIC_ARC_USDC ??
    process.env.NEXT_PUBLIC_USDC_ADDRESS ??
    "",
  eurc:
    process.env.NEXT_PUBLIC_ARC_EURC_ADDRESS ??
    process.env.NEXT_PUBLIC_ARC_EURC ??
    process.env.NEXT_PUBLIC_EURC_ADDRESS ??
    "",
  stableFxRouter:
    process.env.NEXT_PUBLIC_STABLEFX_ROUTER ?? process.env.NEXT_PUBLIC_STABLEFX_ROUTER_ADDRESS ?? "",
  vaultManager:
    process.env.NEXT_PUBLIC_LUMMA_VAULT_MANAGER ?? process.env.NEXT_PUBLIC_VAULT_MANAGER_ADDRESS ?? "",
  milestones:
    process.env.NEXT_PUBLIC_LUMMA_MILESTONES ?? process.env.NEXT_PUBLIC_MILESTONE_NFT_ADDRESS ?? "",
};

function presentAddress(value: string) {
  return value && value.trim().length > 0 ? value : "Not configured";
}

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
    <main className="lumma-systems-root relative min-h-screen overflow-x-hidden bg-[#131313] text-[#e5e2e1]">
      <div className="lumma-systems-supernova fixed inset-0 z-0 opacity-40 grayscale" />
      <div className="lumma-systems-grid-overlay fixed inset-0 z-10 pointer-events-none" />
      <div className="lumma-systems-vertical-text fixed left-8 top-32 z-20 hidden text-[9px] uppercase tracking-[0.4em] text-[#919191]/50 lg:block">
        DOC_INSTANCE: LUMMA_PROTOCOL
      </div>
      <div className="lumma-systems-vertical-text fixed bottom-32 right-8 z-20 hidden text-[9px] uppercase tracking-[0.4em] text-[#919191]/50 lg:block">
        NETWORK_SCOPE: ARC_TESTNET
      </div>

      <header className="fixed top-0 z-50 flex h-20 w-full items-center justify-between border-b border-white/10 bg-[#131313]/90 px-8 backdrop-blur-xl md:px-12">
        <div className="font-display text-xl font-black uppercase tracking-tight text-white md:text-2xl">
          LUMMA//SYSTEMS
        </div>
        <nav className="hidden gap-10 font-display text-[11px] font-bold uppercase tracking-widest md:flex">
          <a className="border-b border-white pb-1 text-white transition-all hover:opacity-70" href="#overview">
            PRODUCT
          </a>
          <a className="text-[#919191] transition-all hover:text-white" href="#deploy">
            DEPLOY
          </a>
          <a className="text-[#919191] transition-all hover:text-white" href="#api">
            API
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="hidden border border-white/20 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80 transition hover:bg-white/8 sm:inline-flex"
          >
            Landing
          </Link>
          <a
            href="https://testnet.lumma.xyz"
            className="border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-white/20"
          >
            Enter Testnet
          </a>
        </div>
      </header>

      <div className="relative z-30 mx-auto max-w-7xl px-4 pb-10 pt-24 sm:px-6">
        <header className="lumma-reveal relative overflow-hidden border border-[var(--lumma-border)] bg-[var(--lumma-bg)] px-5 py-7 lumma-glass-panel" data-reveal>
          <div className="pointer-events-none absolute inset-0 lumma-scanlines opacity-40 mix-blend-overlay" />
          <div className="relative z-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--lumma-fg)]/60">
              Lumma Documentation
            </p>
            <h1 className="mt-3 max-w-5xl font-display text-[clamp(2rem,6.6vw,4.8rem)] leading-[0.94] text-[var(--lumma-fg)]">
              Stablecoin utility + game loops on Arc testnet.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[var(--lumma-fg)]/70">
              Lumma combines yield vaults, USDC/EURC swaps, points, referrals, quests, and milestone NFTs with Privy wallet authentication.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href="https://testnet.lumma.xyz"
                className="rounded-lg border border-[var(--lumma-sky)]/50 bg-[var(--lumma-sky)]/10 px-4 py-2 text-sm font-semibold text-[var(--lumma-sky)] transition hover:bg-[var(--lumma-sky)]/20"
              >
                Enter Testnet
              </a>
              <a
                href="https://docs.arc.network/"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-[var(--lumma-border)] px-4 py-2 text-sm font-semibold text-[var(--lumma-fg)]/80 transition hover:bg-[var(--lumma-fg)]/5"
              >
                Arc Docs <ArrowUpRight className="ml-1 inline" size={14} />
              </a>
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[250px_1fr]">
          <aside className="lumma-reveal h-fit border border-[var(--lumma-border)] bg-[var(--lumma-bg)] p-4 lg:sticky lg:top-5 lumma-glass-panel" data-reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--lumma-fg)]/60">
              Navigation
            </p>
            <nav className="mt-3 flex flex-col gap-1.5">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="rounded-md border border-transparent px-2 py-1.5 text-sm text-[var(--lumma-fg)]/80 transition hover:border-[var(--lumma-border)] hover:bg-[var(--lumma-fg)]/5"
                >
                  {section.label}
                </a>
              ))}
            </nav>
          </aside>

          <div className="space-y-5">
            <DocCard id="overview" title="What Is Lumma" icon={<Sparkles size={16} />}>
              <p>
                Lumma is a yield app on Arc testnet. Users connect with Privy wallets, deposit to risk-tiered vaults, swap between USDC and EURC, and earn points across activity and social loops.
              </p>
              <ul className="list-disc space-y-1 pl-5 text-white/74">
                <li>Arc testnet first, with USDC as native gas token.</li>
                <li>Privy login + embedded wallet + external wallet support.</li>
                <li>Hybrid rewards: offchain points + onchain milestone NFTs.</li>
              </ul>
            </DocCard>

            <DocCard id="features" title="Core Feature Loops" icon={<Flame size={16} />}>
              <div className="grid gap-3 md:grid-cols-2">
                <MiniPanel title="Yield Vaults">
                  Conservative (5-8%), Balanced (8-12%), Aggressive (12-20%). Deposit/withdraw with estimated APY labels.
                </MiniPanel>
                <MiniPanel title="Stable Swaps">
                  USDC ↔ EURC quote + execute flow, history tracking, milestone swap counters.
                </MiniPanel>
                <MiniPanel title="Points + Tasks">
                  Daily/social/activity tasks with anti-sybil checks and cooldowns.
                </MiniPanel>
                <MiniPanel title="Referrals + NFTs">
                  Unique referral code, reward sharing activation rules, and Bronze/Silver/Gold/Diamond claims.
                </MiniPanel>
              </div>
            </DocCard>

            <DocCard id="architecture" title="Architecture" icon={<Blocks size={16} />}>
              <div className="grid gap-3 md:grid-cols-2">
                <MiniPanel title="Surfaces">
                  `lumma.xyz` landing
                  <br />
                  `docs.lumma.xyz` docs
                  <br />
                  `testnet.lumma.xyz` app
                </MiniPanel>
                <MiniPanel title="Auth Layer">
                  Privy access token verification + wallet-based identity mapped to user profile and referral code.
                </MiniPanel>
                <MiniPanel title="Data Layer">
                  Supabase-backed persistence with in-memory fallback when service role key is missing.
                </MiniPanel>
                <MiniPanel title="Onchain Layer">
                  LummaVaultManager + LummaMilestones contracts on Arc testnet, plus StableFX routing for swaps.
                </MiniPanel>
              </div>
            </DocCard>

            <DocCard id="contracts" title="Contract Registry" icon={<Network size={16} />}>
              <CodeBlock
                code={`Chain ID: ${addresses.chainId}
RPC: ${addresses.rpc}
Explorer: ${addresses.explorer}

USDC: ${presentAddress(addresses.usdc)}
EURC: ${presentAddress(addresses.eurc)}
StableFX Router: ${presentAddress(addresses.stableFxRouter)}
LummaVaultManager: ${presentAddress(addresses.vaultManager)}
LummaMilestones: ${presentAddress(addresses.milestones)}`}
              />
              <p className="text-sm text-white/74">
                Values are read from `NEXT_PUBLIC_*` env vars with safe fallbacks.
              </p>
            </DocCard>

            <DocCard id="api" title="Public API Map" icon={<FileCode2 size={16} />}>
              <CodeBlock
                code={`GET  /api/vaults
POST /api/vaults/deposit
POST /api/vaults/withdraw
GET  /api/swap/quote
POST /api/swap/execute
GET  /api/swaps/history
POST /api/points/event
GET  /api/leaderboard
POST /api/referrals/apply
GET  /api/referrals/stats
GET  /api/quests/active
POST /api/quests/complete
POST /api/nft/claim
GET  /api/user/profile
POST /api/user/profile`}
              />
              <p className="text-sm text-white/74">
                API calls are user-scoped via `x-user-id`; authenticated sessions resolve to Privy user IDs.
              </p>
            </DocCard>

            <DocCard id="deploy" title="Deploy Runbook (Lumma on Arc Testnet)" icon={<Wrench size={16} />}>
              <ol className="list-decimal space-y-2 pl-5 text-white/74">
                <li>Install Foundry (`foundryup`) and set Arc RPC + deployer key in env.</li>
                <li>Fund deployer wallet with testnet USDC from Circle faucet (USDC is gas on Arc).</li>
                <li>Deploy Lumma contracts using project script: `npm run deploy:arc`.</li>
                <li>Copy deployed addresses into env vars and redeploy web app.</li>
                <li>Verify contracts and deployment tx on `testnet.arcscan.app`.</li>
              </ol>
              <CodeBlock
                code={`NEXT_PUBLIC_ARC_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_ARC_CHAIN_ID=5042002
DEPLOYER_PRIVATE_KEY=0x...
NEXT_PUBLIC_USDC_ADDRESS=0x...

npm run deploy:arc`}
              />
            </DocCard>

            <DocCard id="ops" title="Operations" icon={<Shield size={16} />}>
              <ul className="list-disc space-y-1 pl-5 text-white/74">
                <li>Pause vault rails with `POST /api/admin/vaults/pause` using `ADMIN_API_TOKEN`.</li>
                <li>Track quote mode warnings (`circle`, `onchain`, `simulation`) in swap responses.</li>
                <li>Keep Supabase service role key configured to avoid temporary in-memory profile mode.</li>
                <li>Keep Privy app ID configured on deployed environments for wallet auth visibility.</li>
              </ul>
            </DocCard>

            <DocCard id="troubleshoot" title="Troubleshooting" icon={<ArrowUpRight size={16} />}>
              <ul className="list-disc space-y-1 pl-5 text-white/74">
                <li>Wallet connect missing: set `NEXT_PUBLIC_PRIVY_APP_ID` and redeploy.</li>
                <li>Username not persisting: set `SUPABASE_SERVICE_ROLE_KEY` and run migrations.</li>
                <li>Swap fallback warning: check `CIRCLE_API_KEY` and `CIRCLE_API_BASE_URL`.</li>
                <li>NFT claim fails: confirm `DEPLOYER_PRIVATE_KEY` and milestone contract address.</li>
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
      className="lumma-reveal relative overflow-hidden border border-[var(--lumma-border)] bg-[var(--lumma-bg)] p-5 text-sm text-[var(--lumma-fg)]/80 lumma-glass-panel"
    >
      <div className="pointer-events-none absolute inset-0 lumma-scanlines opacity-40 mix-blend-overlay" />
      <div className="relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-[var(--lumma-fg)]/70">{icon}</span>
          <h2 className="font-display text-2xl font-semibold text-[var(--lumma-fg)]">{title}</h2>
        </div>
        <div className="mt-3 space-y-3 leading-relaxed">{children}</div>
      </div>
    </section>
  );
}

function MiniPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-[16px] border border-[var(--lumma-border)] bg-[var(--lumma-fg)]/[0.02] p-3 text-sm text-[var(--lumma-fg)]/80">
      <p className="text-xs font-semibold uppercase tracking-[0.13em] text-[var(--lumma-fg)]/60">{title}</p>
      <p className="mt-1 leading-relaxed">{children}</p>
    </article>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto rounded-[16px] border border-[var(--lumma-border)] bg-[var(--lumma-fg)]/[0.04] p-4 text-xs text-[var(--lumma-fg)]">
      <code>{code}</code>
    </pre>
  );
}
