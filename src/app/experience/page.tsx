"use client";

import Link from "next/link";
import { ArrowUpRight, Layers, Rocket, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect } from "react";

import { LummaLogo } from "@/components/brand/lumma-logo";

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
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
          }
        }
      },
      { threshold: 0.16, rootMargin: "0px 0px -10% 0px" },
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

      <div className="mx-auto max-w-[1320px] px-3 pb-14 pt-4 sm:px-5 sm:pt-6">
        <nav className="lumma-reveal border border-white/22 bg-black/78 px-4 py-3 backdrop-blur-sm" data-reveal>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <LummaLogo />
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/"
                className="border border-white/25 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/86 transition hover:bg-white/8"
              >
                Home
              </Link>
              <a
                href="https://docs.lumma.xyz"
                className="border border-white/25 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/86 transition hover:bg-white/8"
              >
                Docs
              </a>
              <a
                href="https://testnet.lumma.xyz"
                className="border border-lumma-sky/45 bg-lumma-sky/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-lumma-sky transition hover:bg-lumma-sky/16"
              >
                Enter Cockpit
              </a>
            </div>
          </div>
        </nav>

        <section className="lumma-reveal relative mt-8 overflow-hidden border border-white/12 bg-[#050913] px-4 py-14 sm:px-8 sm:py-20" data-reveal>
          <div className="pointer-events-none absolute inset-0 lumma-scanlines opacity-70" />
          <div className="relative">
            <p className="inline-flex items-center gap-2 border border-white/24 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/72">
              <Sparkles size={11} />
              Experience Layer
            </p>
            <h1 className="mt-6 max-w-4xl font-display text-[clamp(2rem,6.8vw,6rem)] leading-[0.94] text-white">
              The Lumma protocol loop,
              <span className="block text-white/68">without dead-end screens.</span>
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-relaxed text-white/67 sm:text-base">
              You start with wallet identity, execute stablecoin actions, then compound reputation-like signals through quests and rewards.
            </p>
          </div>
        </section>

        <section className="lumma-reveal mt-10 border border-white/14 bg-[linear-gradient(150deg,#10192b_0%,#0b1323_100%)] px-4 py-8 sm:px-8 sm:py-10" data-reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-[clamp(1.8rem,4.6vw,3.9rem)] leading-[0.95] text-white">Three Layers. One Compounding Outcome.</h2>
            <a
              href="https://testnet.lumma.xyz/app"
              className="inline-flex items-center gap-2 border border-white/24 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/86 transition hover:bg-white/8"
            >
              Open App Deck <ArrowUpRight size={14} />
            </a>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {layers.map((layer, index) => (
              <article
                key={layer.title}
                className="border border-white/14 bg-black/36 p-4"
                style={{ transitionDelay: `${index * 80}ms` }}
              >
                <h3 className="font-display text-2xl leading-none text-white">{layer.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/72">{layer.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="lumma-reveal mt-10 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]" data-reveal>
          <article className="relative overflow-hidden border border-white/12 bg-[#050913] p-5 sm:p-6">
            <div className="pointer-events-none absolute inset-0 lumma-scanlines opacity-65" />
            <div className="relative">
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/58">Execution Sequence</p>
              <ol className="mt-4 space-y-3 text-sm text-white/78">
                {steps.map((step, index) => (
                  <li key={step} className="flex items-start gap-3 border border-white/14 bg-black/35 px-3 py-2">
                    <span className="mt-0.5 text-xs font-semibold text-lumma-lime/86">0{index + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </article>
          <article className="border border-white/12 bg-[linear-gradient(145deg,#d2e8ff_0%,#a8d5ff_100%)] p-5 text-[#08101b] sm:p-6">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#0f1b2a]/65">Operational Posture</p>
            <div className="mt-4 grid gap-3">
              <FeatureLine icon={<Rocket size={16} />} text="Launch cadence and ecosystem response plan." />
              <FeatureLine icon={<Layers size={16} />} text="Modular pages for vaults, swaps, tasks, leaderboard, and quests." />
              <FeatureLine icon={<ShieldCheck size={16} />} text="Strict anti-sybil controls before social rewards settle." />
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}

function FeatureLine({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-2 border border-[#111a29]/25 bg-white/62 px-3 py-2 text-sm text-[#0f1a2a]">
      {icon}
      <span>{text}</span>
    </div>
  );
}
