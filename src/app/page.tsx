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
import { useEffect, useRef, useState } from "react";

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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function sectionProgress(element: HTMLElement | null) {
  if (!element) {
    return 0;
  }
  const rect = element.getBoundingClientRect();
  const viewport = window.innerHeight || 1;
  const start = viewport * 0.92;
  const end = -rect.height * 0.45;
  return clamp((start - rect.top) / (start - end), 0, 1);
}

export default function LandingPage() {
  const mapRef = useRef<HTMLElement | null>(null);
  const [mapProgress, setMapProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      setMapProgress(sectionProgress(mapRef.current));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
          }
        }
      },
      {
        threshold: 0.14,
        rootMargin: "0px 0px -8% 0px",
      },
    );

    const nodes = Array.from(document.querySelectorAll("[data-reveal]"));
    for (const node of nodes) {
      observer.observe(node);
    }
    return () => observer.disconnect();
  }, []);

  const nodeScale = 0.82 + mapProgress * 0.42;
  const nodeShift = mapProgress * 86;
  const pulseOpacity = 0.25 + mapProgress * 0.75;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#04070e] text-[#eceef2]">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-90">
        <div className="lumma-noir-grid" />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-[1320px] flex-col px-3 pb-16 pt-4 sm:px-5 sm:pt-6">
        <nav className="lumma-reveal sticky top-3 z-40 border border-white/22 bg-black/78 px-4 py-3 backdrop-blur-sm sm:px-5" data-reveal>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <LummaLogo />
            <div className="flex flex-wrap items-center gap-2">
              <a
                href="https://docs.lumma.xyz"
                className="border border-white/28 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/86 transition hover:bg-white/8"
              >
                Docs
              </a>
              <a
                href="https://testnet.lumma.xyz"
                className="border border-lumma-sky/45 bg-lumma-sky/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-lumma-sky transition hover:bg-lumma-sky/16"
              >
                Open Cockpit
              </a>
            </div>
          </div>
        </nav>

        <section
          className="lumma-reveal relative mt-7 overflow-hidden border border-white/12 bg-[linear-gradient(180deg,#080d18_0%,#050913_100%)] px-4 py-14 sm:px-8 sm:py-20"
          data-reveal
        >
          <div className="pointer-events-none absolute inset-0 lumma-scanlines opacity-60" />
          <div className="relative">
            <p className="inline-flex items-center gap-2 border border-white/24 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/72">
              <Sparkles size={11} />
              Built on Arc
            </p>
            <h1 className="mt-6 max-w-5xl font-display text-[clamp(2.2rem,7.8vw,7.3rem)] leading-[0.94] tracking-tight text-white">
              Stablecoin utility,
              <span className="block text-white/82">engineered for trust loops.</span>
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-relaxed text-white/68 sm:text-base">
              Lumma merges vaults, swaps, and progression into one protocol surface. Every user action can be verified, scored, and rewarded.
            </p>

            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              <Link
                href="/experience"
                className="group inline-flex items-center justify-between border border-white/28 bg-white/[0.03] px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-white/[0.07]"
              >
                Enter App Experience
                <ArrowUpRight size={14} className="transition group-hover:translate-x-0.5" />
              </Link>
              <a
                href="https://docs.lumma.xyz"
                className="inline-flex items-center justify-between border border-white/20 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/85 transition hover:bg-white/[0.07]"
              >
                Open Lumma Docs
              </a>
            </div>

            <div className="mt-12 border border-[#ff5a1f]/45 bg-black/40 px-4 py-5 sm:px-6 sm:py-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ff6d33]">Protocol Surface</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="border border-white/14 bg-black/40 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/58">Vault Rails</p>
                  <p className="mt-1 font-display text-3xl leading-none text-white">3</p>
                </div>
                <div className="border border-white/14 bg-black/40 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/58">Swap Pairs V1</p>
                  <p className="mt-1 font-display text-3xl leading-none text-white">1</p>
                </div>
                <div className="border border-white/14 bg-black/40 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/58">NFT Tiers</p>
                  <p className="mt-1 font-display text-3xl leading-none text-white">4</p>
                </div>
              </div>
              <p className="mt-3 max-w-xl text-sm text-white/65">
                Measured values only. No fabricated counters.
              </p>
            </div>
          </div>
        </section>

        <section className="lumma-reveal mt-10 px-1 sm:px-0" data-reveal>
          <div className="border border-white/14 bg-[linear-gradient(145deg,#cde8ff_0%,#a6d3ff_36%,#85c7ff_100%)] px-4 py-10 text-[#070d17] sm:px-8 sm:py-14">
            <h2 className="max-w-4xl font-display text-[clamp(1.9rem,6.5vw,5rem)] leading-[0.95]">
              Decentralizing utility
              <span className="block">& reputation signals.</span>
            </h2>

            <div className="mt-7 grid gap-4 lg:grid-cols-3">
              {rails.map((rail, index) => (
                <article
                  key={rail.title}
                  className="border border-[#111826]/28 bg-white/54 p-4 backdrop-blur-sm sm:p-5"
                  style={{ transitionDelay: `${index * 80}ms` }}
                >
                  <h3 className="font-display text-3xl leading-none text-[#050b14]">{rail.title}</h3>
                  <ul className="mt-4 space-y-2 text-sm leading-relaxed text-[#101826]">
                    {rail.points.map((point) => (
                      <li key={point} className="flex items-start gap-2">
                        <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-[#0d1423]" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          ref={mapRef}
          className="lumma-reveal relative mt-10 overflow-hidden border border-white/12 bg-[linear-gradient(180deg,#070c17_0%,#050812_100%)] px-4 py-14 sm:px-8"
          data-reveal
        >
          <div className="pointer-events-none absolute inset-0 lumma-scanlines opacity-70" />
          <div className="relative grid gap-10 lg:grid-cols-[1fr_1fr]">
            <div className="lg:pr-4">
              <h2 className="font-display text-[clamp(2rem,5.5vw,4.9rem)] leading-[0.95] text-white/94">
                How trust is
                <span className="block text-white/75">gained or lost.</span>
              </h2>
              <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/65 sm:text-base">
                Lumma tracks behaviors that matter. Verified activity pushes users upward. Suspicious activity throttles and blocks reward extraction.
              </p>
              <div className="mt-6 space-y-3">
                {trustRows.map((row) => (
                  <div key={row} className="border border-white/18 bg-black/45 px-3 py-2 text-sm text-white/82">
                    {row}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative min-h-[360px] overflow-hidden border border-white/14 bg-black/35 p-4 sm:min-h-[420px] sm:p-6">
              <div
                className="absolute left-[14%] top-[58%] h-[82px] w-[82px] rounded-full border border-lumma-lime/65 bg-lumma-lime/18"
                style={{
                  transform: `translate(${nodeShift * 0.22}px, ${-nodeShift * 0.25}px) scale(${0.8 + mapProgress * 0.3})`,
                }}
              />
              <div
                className="absolute left-[40%] top-[46%] h-[42px] w-[42px] rounded-full border border-lumma-sky/72 bg-lumma-sky/15"
                style={{
                  transform: `translate(${nodeShift * 0.3}px, ${-nodeShift * 0.18}px)`,
                  opacity: pulseOpacity,
                }}
              />
              <div
                className="absolute left-[57%] top-[24%] h-[210px] w-[210px] rounded-full border border-lumma-lime/25 bg-lumma-lime/20 shadow-[0_0_60px_rgba(198,255,92,0.35)]"
                style={{
                  transform: `translate(${nodeShift * 0.12}px, ${-nodeShift * 0.2}px) scale(${nodeScale})`,
                  opacity: 0.62 + mapProgress * 0.3,
                }}
              />
              <div className="absolute left-[22%] top-[62%] h-[1px] w-[42%] bg-lumma-lime/65" />
              <div className="absolute left-[48%] top-[52%] h-[1px] w-[26%] -rotate-[42deg] bg-lumma-lime/55" />

              <div className="absolute left-[54%] top-[34%] rounded-md border border-lumma-lime/42 bg-black/58 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.16em] text-lumma-lime/78">Risk Engine</p>
                <p className="mt-1 font-display text-3xl leading-none text-lumma-lime">Active</p>
              </div>

              <div className="absolute right-4 top-5 space-y-2 text-xs text-white/55">
                <p className="flex items-center gap-1">
                  <CirclePlus size={12} className="text-lumma-lime" />
                  Verified action adds score
                </p>
                <p className="flex items-center gap-1">
                  <ShieldCheck size={12} className="text-[#ff6d33]" />
                  Risk activity cuts rewards
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="lumma-reveal relative mt-10 overflow-hidden border border-white/12 bg-[#050913] px-4 py-16 sm:px-8" data-reveal>
          <div className="pointer-events-none absolute inset-0 lumma-scanlines opacity-75" />
          <div className="relative text-center">
            <p className="text-xs uppercase tracking-[0.15em] text-white/58">Ready to enter the loop?</p>
            <h2 className="mx-auto mt-3 max-w-3xl font-display text-[clamp(2.2rem,6.5vw,5.8rem)] leading-[0.94] text-white/88">
              Sound interesting?
              <span className="block text-white/66">Try Lumma yourself.</span>
            </h2>
            <a
              href="https://testnet.lumma.xyz"
              className="mt-7 inline-flex items-center gap-2 border border-lumma-sky/58 bg-lumma-sky/10 px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-lumma-sky transition hover:bg-lumma-sky/18"
            >
              Open Lumma <ArrowUpRight size={15} />
            </a>

            <div className="mt-12 grid gap-3 sm:grid-cols-3">
              {socialCards.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    className="flex items-center justify-between border border-white/15 bg-black/32 px-4 py-3 text-white/86 transition hover:-translate-y-0.5 hover:border-lumma-sky/52"
                  >
                    <span className="text-sm font-semibold">{item.label}</span>
                    <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-white/62">
                      <Icon size={14} />
                      Pending Link
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
