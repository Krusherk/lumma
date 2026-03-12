"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  CirclePlus,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
  Twitter,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform, useSpring, Variants } from "framer-motion";

import { LummaLogo } from "@/components/brand/lumma-logo";

const socialCards = [
  { label: "X", icon: Twitter, href: "#" },
  { label: "Discord", icon: MessageCircle, href: "#" },
  { label: "Telegram", icon: Send, href: "#" },
];

const rails = [
  {
    title: "Yield Vaults",
    points: ["Conservative / Balanced / Aggressive rails", "APY marked as estimated", "Onchain tx cap + pause controls"],
  },
  {
    title: "StableFX Swaps",
    points: ["USDC <-> EURC quotes and execution", "Milestone progress tracking", "History wired to reward engine"],
  },
  {
    title: "Quest Economy",
    points: ["Weekly mission chains", "Referral share + anti-sybil checks", "NFT milestone evolution states"],
  },
];

const trustRows = [
  "Wallet identity is required for reward settlement.",
  "Referral rewards activate only after first real onchain action.",
  "Suspicious bursts are throttled before points settle.",
];

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
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

export default function LandingPage() {
  const mapRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: mapRef,
    offset: ["start end", "end start"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const nodeScale = useTransform(smoothProgress, [0.3, 0.7], [0.82, 1.24]);
  const nodeShift = useTransform(smoothProgress, [0.2, 0.8], [0, 86]);
  const pulseOpacity = useTransform(smoothProgress, [0.4, 0.6], [0.25, 1]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#04070e] text-[#eceef2]">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-90">
        <div className="lumma-noir-grid" />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-[1320px] flex-col px-3 pb-16 pt-4 sm:px-5 sm:pt-6">
        <motion.nav
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="sticky top-3 z-40 border border-white/10 lumma-glass px-4 py-3 sm:px-5 rounded-2xl mx-1"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <LummaLogo />
            <div className="flex flex-wrap items-center gap-2">
              <a
                href="https://docs.lumma.xyz"
                className="rounded-lg md:rounded-full border border-white/28 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/86 transition-all hover:bg-white/10 hover:border-white/40"
              >
                Docs
              </a>
              <a
                href="https://testnet.lumma.xyz"
                className="rounded-lg md:rounded-full border border-lumma-sky/45 bg-lumma-sky/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-lumma-sky transition-all hover:bg-lumma-sky/20 hover:border-lumma-sky/80 hover:shadow-[0_0_20px_rgba(94,233,255,0.3)]"
              >
                Open Cockpit
              </a>
            </div>
          </div>
        </motion.nav>

        <motion.section
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="relative mt-7 overflow-hidden rounded-[32px] border border-white/5 bg-[linear-gradient(180deg,#0a0f18_0%,#04070e_100%)] px-4 py-16 sm:px-12 sm:py-32 lumma-glass-panel"
        >
          <div className="pointer-events-none absolute inset-0 lumma-scanlines opacity-40" />
          <motion.div variants={fadeUp} className="relative z-10">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/72 backdrop-blur-md">
              <Sparkles size={11} className="text-lumma-sky" />
              Built on Arc
            </p>
            <h1 className="mt-8 max-w-5xl font-display text-[clamp(2.4rem,8.2vw,7.8rem)] leading-[0.92] tracking-[-0.02em] text-white">
              Stablecoin utility,
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white/90 to-white/40">engineered for trust loops.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-white/60 sm:text-lg font-light">
              Lumma merges vaults, swaps, and progression into one protocol surface. Every user action can be verified, scored, and rewarded.
            </p>

            <div className="mt-12 flex flex-wrap gap-4 sm:grid-cols-2">
              <Link
                href="/experience"
                className="group relative overflow-hidden rounded-full border border-white/20 bg-white/5 px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.14em] text-white transition-all hover:bg-white/10 hover:border-white/40 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] flex items-center gap-3"
              >
                Enter App Experience
                <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[lumma-scan_1.5s_ease-in-out_infinite]" />
              </Link>
              <a
                href="https://docs.lumma.xyz"
                className="rounded-full flex items-center justify-between border border-white/10 px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/60 transition-all hover:text-white hover:bg-white/5 hover:border-white/20"
              >
                Open Lumma Docs
              </a>
            </div>

            <motion.div variants={fadeUp} className="mt-16 rounded-[24px] border border-white/10 lumma-glass max-w-3xl overflow-hidden">
              <div className="bg-white/[0.02] border-b border-white/10 px-6 py-4 flex items-center gap-3">
                <div className="flex gap-1.5 opacity-50">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/40"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-white/40"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-white/40"></div>
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40 ml-2">Protocol Surface</p>
              </div>
              <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/10 backdrop-blur-2xl">
                <div className="px-6 py-8 transition-colors hover:bg-white/[0.03]">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/50 mb-2">Vault Rails</p>
                  <p className="font-display text-4xl leading-none text-white font-medium">3</p>
                </div>
                <div className="px-6 py-8 transition-colors hover:bg-white/[0.03]">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/50 mb-2">Swap Pairs V1</p>
                  <p className="font-display text-4xl leading-none text-white font-medium">1</p>
                </div>
                <div className="px-6 py-8 transition-colors hover:bg-white/[0.03]">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/50 mb-2">NFT Tiers</p>
                  <p className="font-display text-4xl leading-none text-white font-medium">4</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.section>

        <motion.section
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="mt-6 px-1 sm:px-0"
        >
          <div className="rounded-[32px] border border-white/10 lumma-glass px-5 py-16 sm:px-12 sm:py-24">
            <motion.h2 variants={fadeUp} className="max-w-4xl font-display text-[clamp(2.1rem,7vw,5.5rem)] leading-[0.92] tracking-tight">
              Decentralizing utility
              <span className="block text-white/40">& reputation signals.</span>
            </motion.h2>

            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {rails.map((rail, index) => (
                <motion.article
                  variants={fadeUp}
                  key={rail.title}
                  className="group relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.02] p-6 sm:p-8 transition-colors hover:bg-white/[0.04] hover:border-white/20"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <h3 className="relative z-10 font-display text-[2rem] leading-none text-white mb-6">{rail.title}</h3>
                  <ul className="relative z-10 space-y-3.5 text-[15px] text-white/60">
                    {rail.points.map((point) => (
                      <li key={point} className="flex items-start gap-3">
                        <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lumma-sky/80" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </motion.article>
              ))}
            </div>
          </div>
        </motion.section>

        <section
          ref={mapRef}
          className="relative mt-6 overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,#070a12_0%,#04070e_100%)] px-5 py-16 sm:p-12 lumma-glass-panel"
        >
          <div className="pointer-events-none absolute inset-0 lumma-scanlines opacity-40" />
          <div className="relative grid gap-12 lg:grid-cols-[1fr_1.2fr] items-center">
            <motion.div
              style={{ opacity: useTransform(smoothProgress, [0, 0.2, 0.8, 1], [0.5, 1, 1, 0.5]) }}
              className="lg:pr-8"
            >
              <h2 className="font-display text-[clamp(2.5rem,6vw,5.5rem)] leading-[0.92] text-white tracking-tight">
                How trust is
                <span className="block text-white/40">gained or lost.</span>
              </h2>
              <p className="mt-8 max-w-xl text-[15px] leading-relaxed text-white/60 sm:text-lg font-light">
                Lumma tracks behaviors that matter. Verified activity pushes users upward. Suspicious activity throttles and blocks reward extraction.
              </p>
              <div className="mt-10 space-y-4">
                {trustRows.map((row, i) => (
                  <motion.div
                    key={row}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4 backdrop-blur-md"
                  >
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white/70">
                      0{i + 1}
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed">{row}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <div className="relative aspect-square w-full max-w-[600px] mx-auto overflow-visible rounded-full border border-white/5 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(94,233,255,0.08)_0%,transparent_50%)]" />

              {/* Outer Orbit */}
              <motion.div
                style={{ rotate: useTransform(smoothProgress, [0, 1], [0, 90]) }}
                className="absolute inset-[10%] rounded-full border border-dashed border-white/10"
              >
                <motion.div
                  style={{ scale: nodeScale }}
                  className="absolute -top-3 left-1/2 -ml-3 h-6 w-6 rounded-full border border-lumma-lime/65 bg-lumma-lime/20 shadow-[0_0_20px_rgba(198,255,92,0.4)]"
                />
              </motion.div>

              {/* Inner Orbit */}
              <motion.div
                style={{ rotate: useTransform(smoothProgress, [0, 1], [360, 0]) }}
                className="absolute inset-[25%] rounded-full border border-white/5"
              >
                <motion.div
                  style={{ opacity: pulseOpacity }}
                  className="absolute top-1/2 -ml-2 -left-2 h-4 w-4 rounded-full border border-lumma-sky/72 bg-lumma-sky/20 shadow-[0_0_15px_rgba(94,233,255,0.5)]"
                />
              </motion.div>

              {/* Center Core */}
              <motion.div
                style={{ scale: useTransform(smoothProgress, [0.2, 0.8], [0.9, 1.1]) }}
                className="absolute left-1/2 top-1/2 flex h-40 w-40 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-lumma-lime/30 bg-[radial-gradient(circle_at_center,rgba(198,255,92,0.15)_0%,rgba(198,255,92,0.05)_100%)] shadow-[0_0_80px_rgba(198,255,92,0.2)] backdrop-blur-xl"
              >
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-lumma-lime/80 font-semibold">Risk Engine</p>
                  <p className="mt-2 font-display text-4xl leading-none text-white tracking-tight">Active</p>
                </div>
              </motion.div>

              <div className="absolute right-0 top-[10%] space-y-3 rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl">
                <p className="flex items-center gap-2 text-xs text-white/70">
                  <CirclePlus size={14} className="text-lumma-lime" />
                  Verified adds score
                </p>
                <div className="h-px w-full bg-white/10" />
                <p className="flex items-center gap-2 text-xs text-white/70">
                  <ShieldCheck size={14} className="text-[#ff6d33]" />
                  Risk cuts rewards
                </p>
              </div>
            </div>
          </div>
        </section>

        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="relative mt-6 overflow-hidden rounded-[32px] border border-white/5 bg-[#04070e] px-4 py-24 sm:px-12 lumma-glass-panel mb-6"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(94,233,255,0.08)_0%,transparent_60%)]" />
          <div className="relative text-center z-10">
            <p className="inline-block rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/50 backdrop-blur-md">
              Ready to enter the loop?
            </p>
            <h2 className="mx-auto mt-6 max-w-3xl font-display text-[clamp(2.5rem,7vw,6.5rem)] leading-[0.92] text-white tracking-tight">
              Sound interesting?
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white/80 to-white/30">Try Lumma yourself.</span>
            </h2>
            <div className="mt-10 flex justify-center">
              <a
                href="https://testnet.lumma.xyz"
                className="group relative overflow-hidden rounded-full border border-lumma-sky/40 bg-lumma-sky/10 px-8 py-4 text-sm font-semibold uppercase tracking-[0.14em] text-lumma-sky transition-all hover:bg-lumma-sky/20 hover:border-lumma-sky/80 hover:shadow-[0_0_30px_rgba(94,233,255,0.2)] flex items-center gap-3 backdrop-blur-md"
              >
                Open Lumma
                <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </a>
            </div>

            <div className="mt-16 grid gap-4 max-w-4xl mx-auto sm:grid-cols-3">
              {socialCards.map((item, i) => {
                const Icon = item.icon;
                return (
                  <motion.a
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    key={item.label}
                    href={item.href}
                    className="group relative overflow-hidden flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-5 text-white/80 transition-all hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.04] hover:shadow-xl backdrop-blur-md"
                  >
                    <span className="text-[15px] font-semibold">{item.label}</span>
                    <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-white/40 transition-colors group-hover:text-white/80">
                      <Icon size={16} />
                      Link
                    </span>
                  </motion.a>
                );
              })}
            </div>
          </div>
        </motion.section>
      </div>
    </main>
  );
}
