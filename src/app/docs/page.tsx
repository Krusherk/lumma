import Link from "next/link";
import { ArrowUpRight, Blocks, FileCode2, Flame, Shield, Sparkles, Wallet } from "lucide-react";

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
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_16%_16%,rgba(94,233,255,0.22),transparent_36%),radial-gradient(circle_at_86%_86%,rgba(198,255,92,0.2),transparent_36%),linear-gradient(150deg,var(--lumma-bg),color-mix(in oklab,var(--lumma-bg),#88aacc 11%))]">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <header className="lumma-glass lumma-rise rounded-3xl px-6 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lumma-ink/68">
            Lumma Protocol Docs
          </p>
          <h1 className="mt-3 max-w-4xl font-display text-4xl font-semibold leading-tight text-lumma-ink sm:text-5xl">
            Stablecoin utility protocol with quest-native incentive layers.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-lumma-ink/80">
            Lumma combines non-custodial vault interactions, StableFX swaps, offchain anti-sybil scoring, and milestone NFT contracts into one growth and retention system on Arc testnet.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href="https://testnet.lumma.xyz"
              className="rounded-xl bg-lumma-ink px-4 py-2 text-sm font-semibold text-[var(--lumma-bg)] transition hover:scale-[1.02]"
            >
              Open Cockpit
            </a>
            <Link
              href="/"
              className="rounded-xl border border-lumma-ink/25 px-4 py-2 text-sm font-semibold text-lumma-ink transition hover:bg-[var(--lumma-panel-strong)]"
            >
              Landing
            </Link>
            <a
              href="https://docs.arc.network/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-lumma-ink/25 px-4 py-2 text-sm font-semibold text-lumma-ink transition hover:bg-[var(--lumma-panel-strong)]"
            >
              Arc Docs <ArrowUpRight className="ml-1 inline" size={14} />
            </a>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="lumma-glass h-fit rounded-2xl p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lumma-ink/58">
              Navigation
            </p>
            <nav className="mt-3 flex flex-col gap-1.5">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="rounded-lg px-2 py-1.5 text-sm text-lumma-ink transition hover:bg-lumma-sand/65"
                >
                  {section.label}
                </a>
              ))}
            </nav>
          </aside>

          <div className="space-y-5">
            <DocCard id="overview" title="Overview" icon={<Sparkles size={16} />}>
              <p>
                Lumma is a loop-based DeFi experience. Users execute vault and swap actions, generate validated activity points, and unlock NFT-driven reward multipliers.
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Arc-native rails: gas in USDC, stablecoin-first UX.</li>
                <li>Offchain scoring engine with strict anti-sybil controls.</li>
                <li>Onchain milestone NFTs for durable reward ownership.</li>
              </ul>
            </DocCard>

            <DocCard id="architecture" title="Architecture" icon={<Blocks size={16} />}>
              <div className="grid gap-3 md:grid-cols-2">
                <MiniPanel title="Frontend">
                  Next.js app with host-based routing:
                  <br />
                  `lumma.xyz` landing
                  <br />
                  `testnet.lumma.xyz` cockpit
                  <br />
                  `docs.lumma.xyz` docs
                </MiniPanel>
                <MiniPanel title="Execution Layer">
                  Vault manager + milestones contracts on Arc testnet.
                  Stable swaps via Arc StableFX router.
                </MiniPanel>
                <MiniPanel title="Reward Engine">
                  Points, referrals, leaderboards, and quest logic in API layer with rule-based gating.
                </MiniPanel>
                <MiniPanel title="Data Layer">
                  Supabase tables for events, proofs, snapshots, and anti-abuse flags.
                </MiniPanel>
              </div>
            </DocCard>

            <DocCard id="contracts" title="Contract Registry" icon={<Wallet size={16} />}>
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
              <p className="text-sm text-lumma-ink/76">
                Contract explorer links:
              </p>
              <ul className="list-disc pl-5 text-sm">
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
              <h3 className="font-display text-xl font-semibold text-lumma-ink">Vault Manager</h3>
              <CodeBlock
                code={`configureVault(bytes32 vaultId, uint8 risk, uint256 txCap)
setGlobalPause(bool paused)
setVaultPause(bytes32 vaultId, bool paused)
deposit(bytes32 vaultId, uint256 amount)
withdraw(bytes32 vaultId, uint256 amount)
getUserPosition(address user, bytes32 vaultId)`}
              />
              <h3 className="font-display text-xl font-semibold text-lumma-ink">Milestones NFT</h3>
              <CodeBlock
                code={`claimMilestone(address account, string tier, string tokenUri)
setContractMetadataURI(string uri)
contractURI()
tokenURI(uint256 tokenId)`}
              />
            </DocCard>

            <DocCard id="apy" title="Estimated APY Model (Testnet)" icon={<Flame size={16} />}>
              <p>
                APY is intentionally modeled offchain for testnet speed and iteration. It updates every 15 minutes and is displayed as estimated only.
              </p>
              <CodeBlock
                code={`estimated_apy = clamp(
  center + wave_drift + time_bucket_noise,
  vault.apy_min,
  vault.apy_max
)`}
              />
              <p className="text-sm text-lumma-ink/76">
                Conservative: 5-8%, Balanced: 8-12%, Aggressive: 12-20%.
              </p>
            </DocCard>

            <DocCard id="security" title="Security Model and Assumptions" icon={<Shield size={16} />}>
              <ul className="list-disc space-y-1 pl-5">
                <li>Vault tx cap is enforced onchain for each configured vault.</li>
                <li>Global pause and per-vault pause are owner-gated emergency controls.</li>
                <li>Points and referrals use strict anti-sybil scoring before settlement.</li>
                <li>Social task rewards are delayed and may be blocked under suspicious patterns.</li>
              </ul>
            </DocCard>

            <DocCard id="integrate" title="Integration Quickstart" icon={<ArrowUpRight size={16} />}>
              <ol className="list-decimal space-y-1 pl-5">
                <li>Set `NEXT_PUBLIC_ARC_CHAIN_ID=5042002` and Arc RPC/explorer envs.</li>
                <li>Configure Privy app id + secret and Supabase keys.</li>
                <li>Set deployed Lumma contract addresses in environment vars.</li>
                <li>For StableFX quotes use `POST https://api.circle.com/v1/exchange/stablefx/quotes` with `CIRCLE_API_KEY`.</li>
                <li>For settlement creation use `POST https://api.circle.com/v1/exchange/stablefx/trades`.</li>
                <li>Use `/api/vaults`, `/api/swap/*`, `/api/points/event`, `/api/nft/claim` for app flows.</li>
              </ol>
            </DocCard>

            <DocCard id="ops" title="Ops Runbook" icon={<Wallet size={16} />}>
              <ul className="list-disc space-y-1 pl-5">
                <li>Pause vaults with `POST /api/admin/vaults/pause` + admin token header.</li>
                <li>Use `npm run deploy:arc` for deterministic redeploy + configure sequence.</li>
                <li>Rotate Privy secret, Supabase service role key, and deployer keys if exposed.</li>
                <li>Verify DNS records point to Vercel before launch announcements.</li>
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
    <section id={id} className="lumma-glass rounded-2xl p-5 text-sm text-lumma-ink/90">
      <div className="flex items-center gap-2">
        <span className="text-lumma-ink/76">{icon}</span>
        <h2 className="font-display text-2xl font-semibold text-lumma-ink">{title}</h2>
      </div>
      <div className="mt-3 space-y-3 leading-relaxed">{children}</div>
    </section>
  );
}

function MiniPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-xl border border-lumma-ink/16 bg-[var(--lumma-panel-strong)] p-3 text-sm text-lumma-ink/85">
      <p className="text-xs font-semibold uppercase tracking-[0.13em] text-lumma-ink/62">{title}</p>
      <p className="mt-1 leading-relaxed">{children}</p>
    </article>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl bg-[#0d1420] p-4 text-xs text-[#d8f8ff]">
      <code>{code}</code>
    </pre>
  );
}

