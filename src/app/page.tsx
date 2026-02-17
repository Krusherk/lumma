import Link from "next/link";
import { ArrowUpRight, Disc3, MessageCircle, Send, Twitter } from "lucide-react";

import { LummaLogo } from "@/components/brand/lumma-logo";

const socialCards = [
  { label: "X", icon: Twitter, href: "#" },
  { label: "Discord", icon: MessageCircle, href: "#" },
  { label: "Telegram", icon: Send, href: "#" },
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_10%_20%,rgba(94,233,255,0.35),transparent_38%),radial-gradient(circle_at_87%_80%,rgba(198,255,92,0.28),transparent_40%),linear-gradient(145deg,var(--lumma-bg),color-mix(in oklab,var(--lumma-bg),#7ba8d7 12%))]">
      <div className="pointer-events-none absolute -left-20 top-14 h-72 w-72 rounded-full bg-lumma-sky/35 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-lumma-lime/30 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-5 pb-16 pt-8">
        <nav className="lumma-glass lumma-rise flex items-center justify-between rounded-2xl px-4 py-3">
          <LummaLogo />
          <div className="flex items-center gap-2">
            <a
              href="https://docs.lumma.xyz"
              className="rounded-xl border border-lumma-ink/25 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-lumma-ink transition hover:bg-lumma-ink hover:text-lumma-sand"
            >
              Docs
            </a>
          </div>
        </nav>

        <section className="lumma-grid mt-10 grid flex-1 items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="lumma-rise">
            <p className="inline-flex items-center gap-2 rounded-full border border-lumma-ink/20 bg-lumma-sand/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-lumma-ink/75">
              <Disc3 size={12} className="animate-[lumma-spin-slow_8s_linear_infinite]" />
              Built on Arc
            </p>
            <h1 className="mt-5 font-display text-5xl font-bold leading-[1.02] tracking-tight text-lumma-ink sm:text-7xl">
              Lumma turns
              <span className="block bg-[linear-gradient(90deg,#5ee9ff,#c6ff5c)] bg-clip-text text-transparent">
                stablecoin utility
              </span>
              into progression loops.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-lumma-ink/78 sm:text-lg">
              Vaults, swaps, points, referrals, and NFT tiers designed like a game economy, built with transparent rails.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/experience"
                className="lumma-scanline rounded-xl bg-lumma-ink px-6 py-3 text-sm font-semibold uppercase tracking-[0.13em] text-lumma-sand transition hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-lumma-sky"
              >
                Enter App
              </Link>
              <a
                href="https://docs.lumma.xyz"
                className="rounded-xl border border-lumma-ink/30 px-6 py-3 text-sm font-semibold uppercase tracking-[0.13em] text-lumma-ink transition hover:bg-[var(--lumma-panel-strong)]"
              >
                Read Docs
              </a>
            </div>
          </div>

          <div className="lumma-float lumma-rise delay-100">
            <article className="lumma-glass rounded-3xl p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lumma-ink/60">
                Mission Feed
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-lumma-ink">
                Arc Orbit is live
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-lumma-ink/75">
                Deposit once, run three swaps, invite one active friend. Complete the chain to unlock quest score multipliers and NFT evolution states.
              </p>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <StatChip label="Vaults" value="3" />
                <StatChip label="Pairs" value="USDC/EURC" />
                <StatChip label="NFT Tiers" value="4" />
              </div>
              <a
                href="https://testnet.lumma.xyz"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-lumma-sky/90 px-4 py-2.5 text-sm font-semibold text-[#051119] transition hover:brightness-105"
              >
                Enter Cockpit <ArrowUpRight size={14} />
              </a>
            </article>
          </div>
        </section>

        <section className="mt-6">
          <div className="lumma-rise grid gap-3 rounded-2xl border border-lumma-ink/15 bg-[var(--lumma-panel)] p-4 sm:grid-cols-3">
            {socialCards.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  className="flex items-center justify-between rounded-xl border border-lumma-ink/18 bg-[var(--lumma-panel-strong)] px-4 py-3 text-lumma-ink transition hover:-translate-y-0.5 hover:border-lumma-sky/60"
                >
                  <span className="text-sm font-semibold">{item.label}</span>
                  <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-lumma-ink/65">
                    <Icon size={15} />
                    Soon
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-lumma-ink/16 bg-lumma-sand/80 px-2 py-2">
      <p className="text-[11px] uppercase tracking-[0.12em] text-lumma-ink/62">{label}</p>
      <p className="mt-1 text-xs font-semibold text-lumma-ink">{value}</p>
    </div>
  );
}
