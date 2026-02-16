import Link from "next/link";
import { ArrowUpRight, Rocket, ShieldCheck, Sparkles } from "lucide-react";

import { LummaLogo } from "@/components/brand/lumma-logo";

const highlights = [
  {
    title: "Yield Vaults",
    description:
      "Conservative, Balanced, and Aggressive vault rails with estimated APY bands and transparent risk labels.",
  },
  {
    title: "StableFX Swaps",
    description:
      "USDC and EURC swap loop on Arc testnet with milestone progress that unlocks reward tiers.",
  },
  {
    title: "Yield Quests",
    description:
      "Weekly mission chains blending vault activity, swaps, and social proofs to evolve your NFT status.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,rgba(94,233,255,0.35),transparent_36%),radial-gradient(circle_at_70%_75%,rgba(198,255,92,0.4),transparent_35%),linear-gradient(135deg,#f7f4ea,#f2f7f9)]">
      <div className="mx-auto max-w-6xl px-5 pb-20 pt-10">
        <nav className="flex items-center justify-between rounded-2xl border border-lumma-ink/15 bg-white/65 px-4 py-3 backdrop-blur">
          <LummaLogo />
          <div className="flex items-center gap-2">
            <Link
              href="/app"
              className="inline-flex items-center gap-1 rounded-xl bg-lumma-ink px-3 py-2 text-sm font-semibold text-lumma-sand transition hover:opacity-90"
            >
              Launch App <ArrowUpRight size={14} />
            </Link>
          </div>
        </nav>

        <section className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="inline-block rounded-full border border-lumma-ink/20 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-lumma-ink/70">
              Built on Arc
            </p>
            <h1 className="mt-5 font-display text-5xl leading-[1.05] font-bold tracking-tight text-lumma-ink sm:text-6xl">
              Stablecoin yield meets game loops.
            </h1>
            <p className="mt-5 max-w-xl text-base text-lumma-ink/80 sm:text-lg">
              Lumma turns vault deposits and stable swaps into quests, points, referrals, and evolving milestone NFTs. Credible rails, playful loops.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/app"
                className="rounded-xl bg-lumma-ink px-5 py-3 text-sm font-semibold text-lumma-sand transition hover:opacity-90"
              >
                Enter Cockpit
              </Link>
              <a
                href="https://docs.arc.network/arc/concepts/welcome-to-arc"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-lumma-ink/30 px-5 py-3 text-sm font-semibold text-lumma-ink transition hover:bg-white/70"
              >
                Read Arc Docs
              </a>
            </div>
          </div>
          <div className="lumma-float rounded-3xl border border-lumma-ink/15 bg-white/60 p-6 shadow-sm backdrop-blur">
            <h2 className="font-display text-xl font-semibold text-lumma-ink">Lumma Launch Arc</h2>
            <p className="mt-2 text-sm text-lumma-ink/75">
              Testnet model APY updates every 15 minutes. No guaranteed returns.
            </p>
            <div className="mt-5 space-y-3">
              <div className="rounded-xl border border-lumma-ink/10 bg-lumma-sand/80 px-3 py-2 text-sm text-lumma-ink">
                Conservative Vault: 5-8%
              </div>
              <div className="rounded-xl border border-lumma-ink/10 bg-lumma-sky/20 px-3 py-2 text-sm text-lumma-ink">
                Balanced Vault: 8-12%
              </div>
              <div className="rounded-xl border border-lumma-ink/10 bg-lumma-alert/15 px-3 py-2 text-sm text-lumma-ink">
                Aggressive Vault: 12-20%
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12 grid gap-4 md:grid-cols-3">
          {highlights.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-lumma-ink/15 bg-white/70 p-5 backdrop-blur"
            >
              <h3 className="font-display text-lg font-semibold text-lumma-ink">{item.title}</h3>
              <p className="mt-2 text-sm text-lumma-ink/80">{item.description}</p>
            </article>
          ))}
        </section>

        <section className="mt-12 rounded-3xl border border-lumma-ink/15 bg-white/70 p-6 backdrop-blur">
          <h2 className="font-display text-2xl font-semibold text-lumma-ink">Social bootstrap</h2>
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
    <div className="flex items-center gap-2 rounded-xl border border-lumma-ink/15 bg-lumma-sand/70 px-3 py-2 text-sm font-medium text-lumma-ink">
      {icon}
      {label}
    </div>
  );
}
