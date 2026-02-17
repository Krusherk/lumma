import Link from "next/link";
import { ArrowUpRight, Rocket, ShieldCheck, Sparkles } from "lucide-react";

import { LummaLogo } from "@/components/brand/lumma-logo";

const highlights = [
  {
    title: "Vault Layer",
    description:
      "Conservative, balanced, and aggressive rails with clear risk signaling and explicit testnet APY estimates.",
  },
  {
    title: "Swap Layer",
    description:
      "StableFX flow centered on USDC/EURC with quote checks, milestone counters, and auditable event history.",
  },
  {
    title: "Reward Layer",
    description:
      "Tasks, quests, referrals, and NFT milestones form a coherent progression economy instead of isolated gimmicks.",
  },
];

const flowSteps = [
  {
    title: "Connect Wallet",
    detail: "Sign in with Privy wallet login and bind your identity to one progression profile.",
  },
  {
    title: "Run Useful Actions",
    detail: "Deposit into vault rails, perform swaps, and complete mission chains that prove activity.",
  },
  {
    title: "Compound Rewards",
    detail: "Settle points, earn referral share, climb leaderboards, and claim milestone NFTs.",
  },
];

export default function ExperiencePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_22%_16%,rgba(94,233,255,0.3),transparent_36%),radial-gradient(circle_at_76%_80%,rgba(198,255,92,0.24),transparent_34%),linear-gradient(150deg,var(--lumma-bg),color-mix(in oklab,var(--lumma-bg),#8cb1d8 10%))] pb-16">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="lumma-orb lumma-orb-a" />
        <div className="lumma-orb lumma-orb-b" />
      </div>

      <div className="mx-auto max-w-7xl px-5 pb-14 pt-8">
        <nav className="lumma-glass lumma-rise flex items-center justify-between rounded-2xl px-4 py-3">
          <LummaLogo />
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-lg border border-lumma-ink/25 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-lumma-ink transition hover:bg-[var(--lumma-panel-strong)]"
            >
              Home
            </Link>
            <a
              href="https://docs.lumma.xyz"
              className="rounded-lg border border-lumma-ink/25 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-lumma-ink transition hover:bg-[var(--lumma-panel-strong)]"
            >
              Docs
            </a>
          </div>
        </nav>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1.14fr_0.86fr] lg:items-start">
          <div className="lumma-rise">
            <p className="inline-flex items-center gap-2 rounded-full border border-lumma-ink/22 bg-lumma-sand/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-lumma-ink/70">
              <Sparkles size={12} />
              Product Experience
            </p>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-[0.98] tracking-tight text-lumma-ink sm:text-6xl">
              A modular DeFi loop,
              <span className="block bg-[linear-gradient(90deg,#5ee9ff,#c6ff5c)] bg-clip-text text-transparent">
                built for retention.
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-lumma-ink/80 sm:text-lg">
              Lumma treats vaults, swaps, and incentives as one system. Every onchain action updates progression and every progression state drives the next action.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a
                href="https://testnet.lumma.xyz"
                className="lumma-scanline rounded-xl bg-lumma-ink px-5 py-3 text-sm font-semibold uppercase tracking-[0.13em] text-[var(--lumma-bg)] transition hover:scale-[1.02]"
              >
                Enter Cockpit
              </a>
              <a
                href="https://docs.lumma.xyz"
                className="rounded-xl border border-lumma-ink/30 px-5 py-3 text-sm font-semibold uppercase tracking-[0.13em] text-lumma-ink transition hover:bg-[var(--lumma-panel-strong)]"
              >
                Read Docs
              </a>
            </div>
          </div>

          <article className="lumma-rise rounded-3xl border border-lumma-ink/15 bg-[var(--lumma-panel)] p-6 shadow-[0_30px_64px_-44px_rgba(6,13,26,0.68)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lumma-ink/62">
              Launch Rails
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-lumma-ink">Arc Testnet Tracks</h2>
            <p className="mt-2 text-sm text-lumma-ink/75">
              APY values are shown as estimated and refreshed in 15-minute windows for transparent testnet behavior.
            </p>
            <div className="mt-4 space-y-2">
              <div className="rounded-xl border border-lumma-ink/14 bg-lumma-sand/65 px-3 py-2 text-sm text-lumma-ink">
                Conservative Vault: 5-8%
              </div>
              <div className="rounded-xl border border-lumma-ink/14 bg-lumma-sky/20 px-3 py-2 text-sm text-lumma-ink">
                Balanced Vault: 8-12%
              </div>
              <div className="rounded-xl border border-lumma-ink/14 bg-lumma-alert/14 px-3 py-2 text-sm text-lumma-ink">
                Aggressive Vault: 12-20%
              </div>
            </div>
            <a
              href="https://testnet.lumma.xyz"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-lumma-sky/88 px-4 py-2 text-sm font-semibold text-[#04131d] transition hover:brightness-105"
            >
              Open Testnet App <ArrowUpRight size={14} />
            </a>
          </article>
        </section>

        <section className="mt-12 rounded-3xl border border-lumma-ink/15 bg-[var(--lumma-panel)] p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.17em] text-lumma-ink/62">
                System Map
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-lumma-ink">
                The Lumma loop in three moves.
              </h2>
            </div>
            <a
              href="https://testnet.lumma.xyz/app"
              className="rounded-lg border border-lumma-ink/25 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-lumma-ink transition hover:bg-[var(--lumma-panel-strong)]"
            >
              Open App Deck
            </a>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {flowSteps.map((step, index) => (
              <article
                key={step.title}
                className="rounded-2xl border border-lumma-ink/14 bg-[var(--lumma-panel-strong)] p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lumma-ink/60">
                  Step {index + 1}
                </p>
                <h3 className="mt-2 font-display text-xl font-semibold text-lumma-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-lumma-ink/76">{step.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {highlights.map((item) => (
            <article
              key={item.title}
              className="lumma-rise rounded-2xl border border-lumma-ink/15 bg-[var(--lumma-panel)] p-5 backdrop-blur"
            >
              <h3 className="font-display text-lg font-semibold text-lumma-ink">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-lumma-ink/80">{item.description}</p>
            </article>
          ))}
        </section>

        <section className="mt-10 rounded-3xl border border-lumma-ink/15 bg-[var(--lumma-panel)] p-6 backdrop-blur">
          <h2 className="font-display text-2xl font-semibold text-lumma-ink">Operational Posture</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <FeatureBadge icon={<Rocket size={16} />} label="Launch cadence and content ops ready" />
            <FeatureBadge icon={<Sparkles size={16} />} label="Quest narratives drive weekly reactivation" />
            <FeatureBadge icon={<ShieldCheck size={16} />} label="Anti-sybil controls gate suspicious rewards" />
          </div>
        </section>
      </div>
    </main>
  );
}

function FeatureBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-lumma-ink/15 bg-lumma-sand/62 px-3 py-2 text-sm font-medium text-lumma-ink">
      {icon}
      {label}
    </div>
  );
}
