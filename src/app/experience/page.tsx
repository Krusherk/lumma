"use client";

import Link from "next/link";
import { ArrowUpRight, Layers, Rocket, ShieldCheck, Sparkles } from "lucide-react";
import { motion, Variants } from "framer-motion";

import { LummaLogo } from "@/components/brand/lumma-logo";

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 20 },
  },
};

const layers = [
  {
    title: "Access Layer",
    text: "Privy wallet login, profile binding, and identity-aware progression rails.",
  },
  {
    title: "Execution Layer",
    text: "Vault deposit/withdraw and StableFX swap actions wired to Arc-native contracts.",
  },
  {
    title: "Incentive Layer",
    text: "Points, quests, referrals, and milestone NFTs resolved by anti-sybil-aware scoring.",
  },
];

const steps = [
  "Connect wallet and set your profile identity.",
  "Deposit into a vault rail and execute stable swaps.",
  "Complete quests to compound points and unlock NFTs.",
];

export default function ExperiencePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--lumma-bg)] text-[var(--lumma-fg)]">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="lumma-noir-grid opacity-90" />
      </div>

      <div className="mx-auto max-w-[1320px] px-3 pb-14 pt-4 sm:px-5 sm:pt-6">
        <motion.nav
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="sticky top-3 z-40 border border-[var(--lumma-border)] lumma-glass px-4 py-3 sm:px-5 rounded-2xl mx-1"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <LummaLogo />
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/"
                className="rounded-lg md:rounded-full border border-[var(--lumma-border)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--lumma-fg)] opacity-80 transition-all hover:bg-[var(--lumma-fg)]/10"
              >
                Home
              </Link>
              <a
                href="https://docs.lumma.xyz"
                className="rounded-lg md:rounded-full border border-[var(--lumma-border)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--lumma-fg)] opacity-80 transition-all hover:bg-[var(--lumma-fg)]/10"
              >
                Docs
              </a>
              <a
                href="https://testnet.lumma.xyz"
                className="rounded-full border border-[var(--lumma-sky)]/40 bg-[var(--lumma-sky)]/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--lumma-sky)] transition-all hover:bg-[var(--lumma-sky)]/20 shadow-[0_0_15px_rgba(14,165,233,0.15)] backdrop-blur-md"
              >
                Enter Cockpit
              </a>
            </div>
          </div>
        </motion.nav>

        <motion.section
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="relative mt-7 overflow-hidden rounded-[32px] border border-[var(--lumma-border)] bg-[var(--lumma-bg)] px-4 py-16 sm:px-12 sm:py-24 lumma-glass-panel"
        >
          <div className="pointer-events-none absolute inset-0 lumma-scanlines opacity-40" />
          <motion.div variants={fadeUp} className="relative z-10">
            <p className="inline-flex items-center gap-2 rounded-full border border-[var(--lumma-border)] bg-[var(--lumma-fg)]/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--lumma-fg)]/70 backdrop-blur-md">
              <Sparkles size={11} className="text-[var(--lumma-sky)]" />
              Experience Layer
            </p>
            <h1 className="mt-8 max-w-4xl font-display text-[clamp(2.4rem,7vw,6.5rem)] leading-[0.92] tracking-[-0.02em] text-[var(--lumma-fg)]">
              The Lumma protocol loop,
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[var(--lumma-fg)] to-[var(--lumma-fg)]/40">without dead-end screens.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-[var(--lumma-fg)]/60 sm:text-lg font-light">
              You start with wallet identity, execute stablecoin actions, then compound reputation-like signals through quests and rewards.
            </p>
          </motion.div>
        </motion.section>

        <motion.section
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="mt-6 rounded-[32px] border border-[var(--lumma-border)] bg-[var(--lumma-bg)] px-5 py-16 sm:px-12 sm:py-20 lumma-glass-panel"
        >
          <motion.div variants={fadeUp} className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-[clamp(2rem,5vw,4.5rem)] leading-[0.92] text-[var(--lumma-fg)] tracking-tight">Three Layers.<span className="block text-[var(--lumma-fg)]/40">One Compounding Outcome.</span></h2>
            <a
              href="https://testnet.lumma.xyz/app"
              className="group relative overflow-hidden flex items-center gap-3 rounded-full border border-[var(--lumma-border)] bg-[var(--lumma-fg)]/5 px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--lumma-fg)] transition-all hover:bg-[var(--lumma-fg)]/10"
            >
              Open App Deck
              <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </a>
          </motion.div>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {layers.map((layer) => (
              <motion.article
                variants={fadeUp}
                key={layer.title}
                className="group relative overflow-hidden rounded-[24px] border border-[var(--lumma-border)] bg-[var(--lumma-fg)]/[0.02] p-6 sm:p-8 transition-colors hover:bg-[var(--lumma-fg)]/[0.04]"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-[var(--lumma-fg)]/[0.05] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <h3 className="relative z-10 font-display text-[2rem] leading-none text-[var(--lumma-fg)] mb-4">{layer.title}</h3>
                <p className="relative z-10 text-[15px] leading-relaxed text-[var(--lumma-fg)]/60">{layer.text}</p>
              </motion.article>
            ))}
          </div>
        </motion.section>

        <motion.section
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]"
        >
          <motion.article variants={fadeUp} className="relative overflow-hidden rounded-[32px] border border-[var(--lumma-border)] bg-[var(--lumma-bg)] p-6 sm:p-10 lumma-glass-panel">
            <div className="pointer-events-none absolute inset-0 lumma-scanlines opacity-30" />
            <div className="relative">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lumma-fg)]/50 font-semibold">Execution Sequence</p>
              <ol className="mt-8 space-y-4 text-[15px] text-[var(--lumma-fg)]/80">
                {steps.map((step, index) => (
                  <li key={step} className="flex items-start gap-4 rounded-2xl border border-[var(--lumma-border)] bg-[var(--lumma-fg)]/[0.02] px-5 py-4 backdrop-blur-sm">
                    <span className="mt-0.5 text-xs font-semibold text-[var(--lumma-lime)] opacity-90 bg-[var(--lumma-lime)]/10 px-2 py-1 rounded">0{index + 1}</span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </motion.article>
          <motion.article variants={fadeUp} className="overflow-hidden rounded-[32px] border border-[var(--lumma-border)] bg-[linear-gradient(145deg,var(--lumma-sky),var(--lumma-bg))] p-6 sm:p-10 lumma-glass-panel flex flex-col justify-center relative">
            <div className="absolute inset-0 opacity-10 bg-white" />
            <div className="relative z-10">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lumma-fg)]/70 font-semibold mix-blend-overlay">Operational Posture</p>
              <div className="mt-8 grid gap-4">
                <FeatureLine icon={<Rocket size={18} className="opacity-70" />} text="Launch cadence and ecosystem response plan." />
                <FeatureLine icon={<Layers size={18} className="opacity-70" />} text="Modular pages for vaults, swaps, tasks, leaderboard, and quests." />
                <FeatureLine icon={<ShieldCheck size={18} className="opacity-70" />} text="Strict anti-sybil controls before social rewards settle." />
              </div>
            </div>
          </motion.article>
        </motion.section>
      </div>
    </main>
  );
}

function FeatureLine({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[var(--lumma-border)] bg-[var(--lumma-bg)]/80 px-5 py-4 text-[15px] text-[var(--lumma-fg)] backdrop-blur-md shadow-sm">
      <div className="mt-0.5 bg-[var(--lumma-fg)]/10 p-1.5 rounded-full">{icon}</div>
      <span>{text}</span>
    </div>
  );
}
