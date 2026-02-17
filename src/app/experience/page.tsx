import Link from "next/link";
import { ArrowUpRight, Rocket, ShieldCheck, Sparkles } from "lucide-react";

import { LummaLogo } from "@/components/brand/lumma-logo";

const highlights = [
  {
    title: "Yield Vaults",
    description:
      "Conservative, Balanced, and Aggressive rails with visible risk tiers and estimated APY models.",
  },
  {
    title: "StableFX Swaps",
    description:
      "USDC <-> EURC swaps with milestone progression and onchain event trails.",
  },
  {
    title: "Yield Quests",
    description:
      "Weekly mission arcs combining vault, swap, and referral behavior into evolving NFT state.",
  },
];

export default function ExperiencePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_22%_18%,rgba(94,233,255,0.3),transparent_36%),radial-gradient(circle_at_76%_82%,rgba(198,255,92,0.26),transparent_35%),linear-gradient(130deg,var(--lumma-bg),color-mix(in oklab,var(--lumma-bg),#8fb2d8 12%))] pb-16">
      <div className="mx-auto max-w-6xl px-5 pb-14 pt-8">
        <nav className="lumma-glass lumma-rise flex items-center justify-between rounded-2xl px-4 py-3">
          <LummaLogo />
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-xl border border-lumma-ink/25 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-lumma-ink transition hover:bg-[var(--lumma-panel-strong)]"
            >
              Home
            </Link>
            <a
              href="https://docs.lumma.xyz"
              className="rounded-xl border border-lumma-ink/25 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-lumma-ink transition hover:bg-[var(--lumma-panel-strong)]"
            >
              Docs
            </a>
          </div>
        </nav>

        <section className="mt-10 grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div className="lumma-rise">
            <p className="inline-block rounded-full border border-lumma-ink/20 bg-lumma-sand/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-lumma-ink/70">
              Product Experience
            </p>
            <h1 className="mt-5 font-display text-5xl leading-[1.02] font-bold tracking-tight text-lumma-ink sm:text-6xl">
              The Lumma dApp loop
            </h1>
            <p className="mt-5 max-w-xl text-base text-lumma-ink/80 sm:text-lg">
              Lumma turns stablecoin actions into ranked progression. Swap, vault, and quest behavior compounds into points, referral share, and milestone NFT advantages.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a
                href="https://testnet.lumma.xyz"
                className="lumma-scanline rounded-xl bg-lumma-ink px-5 py-3 text-sm font-semibold text-lumma-sand transition hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-lumma-sky"
              >
                Enter Cockpit
              </a>
              <a
                href="https://docs.lumma.xyz"
                className="rounded-xl border border-lumma-ink/30 px-5 py-3 text-sm font-semibold text-lumma-ink transition hover:bg-[var(--lumma-panel-strong)]"
              >
                Read Lumma Docs
              </a>
            </div>
          </div>
          <div className="lumma-float rounded-3xl border border-lumma-ink/15 bg-[var(--lumma-panel)] p-6 shadow-sm backdrop-blur">
            <h2 className="font-display text-xl font-semibold text-lumma-ink">Launch Arc Tracks</h2>
            <p className="mt-2 text-sm text-lumma-ink/75">
              APY values are estimated from a transparent testnet model refreshed every 15 minutes.
            </p>
            <div className="mt-5 space-y-3">
              <div className="rounded-xl border border-lumma-ink/12 bg-lumma-sand/70 px-3 py-2 text-sm text-lumma-ink">
                Conservative Vault: 5-8%
              </div>
              <div className="rounded-xl border border-lumma-ink/12 bg-lumma-sky/20 px-3 py-2 text-sm text-lumma-ink">
                Balanced Vault: 8-12%
              </div>
              <div className="rounded-xl border border-lumma-ink/12 bg-lumma-alert/14 px-3 py-2 text-sm text-lumma-ink">
                Aggressive Vault: 12-20%
              </div>
            </div>
            <a
              href="https://testnet.lumma.xyz"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-lumma-sky/90 px-4 py-2 text-sm font-semibold text-[#041018] transition hover:brightness-105"
            >
              Go to Testnet App <ArrowUpRight size={14} />
            </a>
          </div>
        </section>

        <section className="mt-12 grid gap-4 md:grid-cols-3">
          {highlights.map((item) => (
            <article
              key={item.title}
              className="lumma-rise rounded-2xl border border-lumma-ink/15 bg-[var(--lumma-panel)] p-5 backdrop-blur"
            >
              <h3 className="font-display text-lg font-semibold text-lumma-ink">{item.title}</h3>
              <p className="mt-2 text-sm text-lumma-ink/80">{item.description}</p>
            </article>
          ))}
        </section>

        <section className="mt-12 rounded-3xl border border-lumma-ink/15 bg-[var(--lumma-panel)] p-6 backdrop-blur">
          <h2 className="font-display text-2xl font-semibold text-lumma-ink">Growth Operations</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <FeatureBadge icon={<Rocket size={16} />} label="X launch cadence ready" />
            <FeatureBadge icon={<Sparkles size={16} />} label="Yield Quest narratives" />
            <FeatureBadge icon={<ShieldCheck size={16} />} label="Strict anti-sybil posture" />
          </div>
        </section>
      </div>
    </main>
  );
}

function FeatureBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-lumma-ink/15 bg-lumma-sand/60 px-3 py-2 text-sm font-medium text-lumma-ink">
      {icon}
      {label}
    </div>
  );
}

