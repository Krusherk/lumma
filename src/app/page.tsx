import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  MessageCircle,
  Send,
  Sparkles,
  Twitter,
} from "lucide-react";

import { LummaLogo } from "@/components/brand/lumma-logo";

const trustPills = [
  "Built on Arc testnet",
  "Stablecoin-first UX",
  "Quest-native incentives",
  "Estimated APY labels always visible",
];

const featureRails = [
  {
    title: "Yield Vaults",
    description:
      "Three risk rails with estimated APY, live position tracking, and transaction caps enforced by contract logic.",
  },
  {
    title: "StableFX Swaps",
    description:
      "USDC and EURC routes with quote visibility, milestones, and event history that feeds your reward progression.",
  },
  {
    title: "Progression Layer",
    description:
      "Tasks, referrals, points, leaderboard ranks, and milestone NFTs that evolve as users stay active.",
  },
];

const socialCards = [
  { label: "X", icon: Twitter, href: "#" },
  { label: "Discord", icon: MessageCircle, href: "#" },
  { label: "Telegram", icon: Send, href: "#" },
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_8%_14%,rgba(94,233,255,0.34),transparent_38%),radial-gradient(circle_at_92%_82%,rgba(198,255,92,0.22),transparent_35%),linear-gradient(165deg,var(--lumma-bg),color-mix(in oklab,var(--lumma-bg),#7eaad4 9%))]">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="lumma-orb lumma-orb-a" />
        <div className="lumma-orb lumma-orb-b" />
        <div className="lumma-orb lumma-orb-c" />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 pb-16 pt-8">
        <nav className="lumma-glass lumma-rise flex items-center justify-between rounded-2xl px-4 py-3">
          <LummaLogo />
          <div className="flex items-center gap-2">
            <a
              href="https://docs.lumma.xyz"
              className="rounded-lg border border-lumma-ink/25 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-lumma-ink transition hover:bg-[var(--lumma-panel-strong)]"
            >
              Docs
            </a>
            <a
              href="https://testnet.lumma.xyz"
              className="rounded-lg bg-lumma-ink px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--lumma-bg)] transition hover:-translate-y-0.5"
            >
              Enter Cockpit
            </a>
          </div>
        </nav>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div className="lumma-rise">
            <p className="inline-flex items-center gap-2 rounded-full border border-lumma-ink/20 bg-lumma-sand/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-lumma-ink/72">
              <Sparkles size={12} />
              Stablecoin utility with game loops
            </p>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-[0.98] tracking-tight text-lumma-ink sm:text-7xl">
              A trust-forward stablecoin cockpit,
              <span className="block bg-[linear-gradient(90deg,#5ee9ff,#c6ff5c)] bg-clip-text text-transparent">
                designed to feel alive.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-lumma-ink/78 sm:text-lg">
              Lumma combines vaults, swaps, and progression mechanics into one coherent system. Users are rewarded for useful behavior, not empty clicks.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/experience"
                className="lumma-scanline rounded-xl bg-lumma-ink px-6 py-3 text-sm font-semibold uppercase tracking-[0.13em] text-[var(--lumma-bg)] transition hover:scale-[1.02]"
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

            <div className="mt-8 grid gap-2 sm:grid-cols-2">
              {trustPills.map((pill) => (
                <div
                  key={pill}
                  className="flex items-center gap-2 rounded-xl border border-lumma-ink/15 bg-[var(--lumma-panel)] px-3 py-2 text-sm text-lumma-ink"
                >
                  <CheckCircle2 size={14} className="text-lumma-ink/72" />
                  {pill}
                </div>
              ))}
            </div>
          </div>

          <aside className="lumma-rise space-y-4">
            <article className="lumma-glass rounded-3xl p-5 shadow-[0_30px_68px_-46px_rgba(5,11,22,0.7)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lumma-ink/62">
                Live Mode
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-lumma-ink">Arc Orbit Quest Active</h2>
              <p className="mt-2 text-sm leading-relaxed text-lumma-ink/76">
                Deposit, run swaps, and invite an active friend to complete this mission chain. Finishers unlock boosted progression states.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <StatCard label="Vault Rails" value="3" />
                <StatCard label="Swap Pair" value="USDC/EURC" />
                <StatCard label="NFT Tiers" value="4" />
                <StatCard label="Mode" value="Testnet" />
              </div>
              <a
                href="https://testnet.lumma.xyz"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-lumma-sky/85 px-4 py-2.5 text-sm font-semibold text-[#05131c] transition hover:brightness-105"
              >
                Open Cockpit <ArrowUpRight size={14} />
              </a>
            </article>

            <article className="rounded-3xl border border-lumma-ink/16 bg-[var(--lumma-panel)] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lumma-ink/62">
                Trust Surface
              </p>
              <ul className="mt-3 space-y-2 text-sm text-lumma-ink/78">
                <li className="rounded-lg border border-lumma-ink/14 bg-[var(--lumma-panel-strong)] px-3 py-2">
                  Contract-backed vault caps and pause controls.
                </li>
                <li className="rounded-lg border border-lumma-ink/14 bg-[var(--lumma-panel-strong)] px-3 py-2">
                  Anti-sybil checks on points and referral payout.
                </li>
                <li className="rounded-lg border border-lumma-ink/14 bg-[var(--lumma-panel-strong)] px-3 py-2">
                  Rewards exposed with explicit estimated labels.
                </li>
              </ul>
            </article>
          </aside>
        </section>

        <section className="mt-12">
          <div className="rounded-3xl border border-lumma-ink/16 bg-[var(--lumma-panel)] p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lumma-ink/62">
                  Product Rails
                </p>
                <h2 className="mt-2 font-display text-3xl font-semibold text-lumma-ink">
                  Three layers, one compounding loop.
                </h2>
              </div>
              <Link
                href="/experience"
                className="rounded-lg border border-lumma-ink/25 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-lumma-ink transition hover:bg-[var(--lumma-panel-strong)]"
              >
                Explore Experience
              </Link>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {featureRails.map((item) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-lumma-ink/14 bg-[var(--lumma-panel-strong)] p-4"
                >
                  <h3 className="font-display text-xl font-semibold text-lumma-ink">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-lumma-ink/76">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="grid gap-3 rounded-2xl border border-lumma-ink/15 bg-[var(--lumma-panel)] p-4 sm:grid-cols-3">
            {socialCards.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  className="flex items-center justify-between rounded-xl border border-lumma-ink/16 bg-[var(--lumma-panel-strong)] px-4 py-3 text-lumma-ink transition hover:-translate-y-0.5 hover:border-lumma-sky/55"
                >
                  <span className="text-sm font-semibold">{item.label}</span>
                  <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-lumma-ink/64">
                    <Icon size={14} />
                    Soon
                  </span>
                </a>
              );
            })}
          </div>
        </section>

        <section className="mt-6">
          <div className="rounded-2xl border border-lumma-ink/18 bg-[var(--lumma-panel-strong)] p-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-lumma-ink/62">Built on Arc</p>
            <p className="mt-2 text-sm text-lumma-ink/75">
              Lumma is in public testnet mode. APY values are model-based estimates, not guaranteed returns.
            </p>
            <a
              href="https://testnet.lumma.xyz"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-lumma-ink px-4 py-2 text-sm font-semibold text-[var(--lumma-bg)] transition hover:-translate-y-0.5"
            >
              Enter Testnet Cockpit <ArrowUpRight size={14} />
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-lumma-ink/14 bg-[var(--lumma-panel-strong)] px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.14em] text-lumma-ink/62">{label}</p>
      <p className="mt-1 text-sm font-semibold text-lumma-ink">{value}</p>
    </div>
  );
}
