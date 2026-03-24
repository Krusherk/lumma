import Image from "next/image";
import Link from "next/link";

const capabilityCards = [
  {
    kind: "throughput",
    title: "Vault APY Bands",
    icon: "savings",
    value: "5-20",
    unit: "%",
    footerLeft: "Conservative: 5-8%",
    footerRight: "Aggressive: 12-20%",
  },
  {
    kind: "nodes",
    title: "Stablecoin Pair",
    icon: "swap_horiz",
    value: "USDC/EURC",
    unit: "",
    footerLeft: "Rail: Circle StableFX",
    footerRight: "Live on Arc testnet",
  },
  {
    kind: "uptime",
    title: "Reward Engines",
    icon: "stars",
    value: "6",
    unit: "LOOPS",
    footerLeft: "Points, referrals, quests",
    footerRight: "NFT milestones enabled",
  },
];

const systemFeed = [
  { event: "PRIVY_AUTH_PROVIDER_READY", time: "12:04:22" },
  { event: "ARC_TESTNET_RPC_HEALTHY", time: "12:02:15" },
  { event: "VAULT_APY_MODEL_REFRESHED", time: "11:58:04" },
  { event: "STABLEFX_QUOTE_CHANNEL_ACTIVE", time: "11:45:30" },
  { event: "POINTS_REFERRAL_ENGINE_SYNCED", time: "11:30:12" },
];

export default function LandingPage() {
  return (
    <main className="lumma-systems-root relative min-h-screen overflow-x-hidden bg-[#131313] font-sans text-[#e5e2e1]">
      <div className="lumma-systems-supernova fixed inset-0 z-0 opacity-40 grayscale" />
      <div className="lumma-systems-grid-overlay fixed inset-0 z-10 pointer-events-none" />

      <div className="lumma-systems-vertical-text fixed left-8 top-32 z-20 hidden text-[9px] uppercase tracking-[0.4em] text-[#919191]/50 lg:block">
        ARC_SCOPE: TESTNET_ONLY
      </div>
      <div className="lumma-systems-vertical-text fixed bottom-32 right-8 z-20 hidden text-[9px] uppercase tracking-[0.4em] text-[#919191]/50 lg:block">
        APP_MODE: YIELD + QUESTS
      </div>

      <header className="fixed top-0 z-50 flex h-20 w-full items-center justify-between border-b border-white/10 bg-[#131313]/90 px-8 backdrop-blur-xl md:px-12">
        <div className="font-display text-xl font-black uppercase tracking-tight text-white md:text-2xl">
          LUMMA//SYSTEMS
        </div>

        <nav className="hidden gap-10 font-display text-[11px] font-bold uppercase tracking-widest md:flex">
          <a className="border-b border-white pb-1 text-white transition-all hover:opacity-70" href="#network">
            PRODUCT
          </a>
          <a className="text-[#919191] transition-all hover:text-white" href="#capabilities">
            FEATURES
          </a>
          <a className="text-[#919191] transition-all hover:text-white" href="#terminal">
            TESTNET
          </a>
        </nav>

        <div className="flex items-center gap-6">
          <div className="hidden gap-4 sm:flex">
            <span className="material-symbols-outlined text-xl text-white/50">sensors</span>
            <span className="material-symbols-outlined text-xl text-white/50">barcode_scanner</span>
          </div>
          <Image
            alt="System operator avatar"
            className="h-9 w-9 border border-white/20 object-cover grayscale"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAhMMJ67-_Ov9G9mYaqm-q10CEKt7M-ez6R4fipyRw6f7qWUvxVekC_d8M70oapqEAVbfwVrzagGSLvI6FKCmNNiaQ5mTtEW81QiB5B-KT_jihceni3S5M3K5yUkBFqS3f2gbT83_Mtz4zFLiJTMGnjboQ6gq5XC5bT-hMlCw5Vv06XT8kNrvhMVyNzUHlatRHnnOlLXKFHWGg58GSgNZ9zjewKHEwg_pmSKixFMYtaaXxVCFoYi0q6rTQ8IGukLILZ134Ik7hZJ0Ar"
            width={36}
            height={36}
          />
        </div>
      </header>

      <div className="relative z-30 pt-20">
        <section
          id="network"
          className="group relative flex min-h-screen flex-col items-center justify-center overflow-hidden border-b border-white/5 px-8 md:px-12"
        >
          <div className="lumma-systems-scanline absolute left-0 top-0 opacity-20 transition-opacity group-hover:opacity-40" />

          <div className="relative mb-12 h-48 w-48">
            <Image
              alt="L circuit logo"
              className="h-full w-full object-contain brightness-200 grayscale"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAgDey_hqL3N-MhOhEYTVnhNN5rJixEYVpC5TYFOYlIBNy0lqOmgxNQivr5Bo38f9x2fO2A4V67Zd9Vcl8r_VNrz7moqqpe13KsgJAk-cqzaAGVy-6ZA7Bi8PztPrR5K4S6D8ea5Q7Hu5GYe0065Lfm-95UvQXOAJ2T2uK7v_JM1gvJ7mh5mcCEWmIWhO9c0YnVKaGZTVFzloNev8HhfHyIhszKEb_M61CZsSpw5tah9JnPxlMuHlu5YlziyWAFSJZjODhttzVODimz"
              width={192}
              height={192}
            />
            <div className="absolute inset-0 animate-pulse bg-white/10 blur-3xl" />
          </div>

          <div className="text-center">
            <h1 className="mb-4 font-display text-4xl font-black uppercase tracking-[0.25em] text-white md:text-6xl lg:text-7xl">
              LUMMA_TESTNET_ACTIVE
            </h1>
            <p className="flex flex-wrap justify-center gap-4 text-[10px] uppercase tracking-[0.6em] text-[#919191] md:text-xs">
              <span>BUILT_ON: ARC_TESTNET</span>
              <span className="hidden sm:inline">{"//"}</span>
              <span>GAS_TOKEN: USDC</span>
              <span className="hidden sm:inline">{"//"}</span>
              <span>AUTH: PRIVY_WALLET</span>
            </p>
          </div>

          <div className="absolute bottom-12 flex flex-col items-center gap-4">
            <span className="animate-bounce text-[9px] uppercase tracking-widest text-[#919191]">
              SCROLL_FOR_LUMMA
            </span>
            <div className="h-16 w-px bg-gradient-to-b from-white to-transparent" />
          </div>

          <div className="absolute left-12 top-24 hidden border-l border-white/20 py-2 pl-4 lg:block">
            <span className="block text-[10px] text-[#919191]">X_LATENCY</span>
            <span className="block font-display text-xl text-white">SWAP: USDC/EURC</span>
          </div>

          <div className="absolute bottom-24 right-12 hidden border-r border-white/20 py-2 pr-4 text-right lg:block">
            <span className="block text-[10px] text-[#919191]">AUTH_LAYER</span>
            <span className="block font-display text-xl text-white">PRIVY_READY</span>
          </div>
        </section>

        <section id="capabilities" className="mx-auto max-w-7xl px-8 py-24 md:px-12 md:py-32">
          <div className="mb-20">
            <span className="mb-2 block text-[10px] uppercase tracking-[0.4em] text-[#919191]">
              SUBSECTION_01
            </span>
            <h2 className="font-display text-4xl font-bold uppercase tracking-tight text-white">
              LUMMA_CORE_FEATURES
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {capabilityCards.map((card) => (
              <article
                key={card.title}
                className="group border border-white/10 bg-[#353534]/40 p-8 backdrop-blur-xl transition-all hover:border-white/30"
              >
                <div className="mb-16 flex items-start justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-[#919191]">{card.title}</span>
                  <span className="material-symbols-outlined text-sm text-white">{card.icon}</span>
                </div>

                <div className="mb-6 flex items-baseline gap-2">
                  <span className="font-display text-5xl font-bold text-white">{card.value}</span>
                  {card.unit ? <span className="text-sm uppercase tracking-wider text-[#919191]">{card.unit}</span> : null}
                  {card.kind === "nodes" ? (
                    <span
                      className="material-symbols-outlined animate-pulse text-xs text-white"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      circle
                    </span>
                  ) : null}
                </div>

                {card.kind === "throughput" ? (
                  <>
                    <div className="relative h-1 w-full bg-white/10">
                      <div className="absolute left-0 top-0 h-full w-2/3 bg-white shadow-[0_0_12px_rgba(255,255,255,0.6)]" />
                    </div>
                    <div className="mt-6 flex justify-between text-[10px] uppercase tracking-tight text-[#919191]">
                      <span>{card.footerLeft}</span>
                      <span>{card.footerRight}</span>
                    </div>
                  </>
                ) : null}

                {card.kind === "nodes" ? (
                  <>
                    <div className="grid h-1 grid-cols-12 gap-1">
                      <div className="bg-white" />
                      <div className="bg-white" />
                      <div className="bg-white" />
                      <div className="bg-white/20" />
                      <div className="bg-white" />
                      <div className="bg-white" />
                      <div className="bg-white/20" />
                      <div className="bg-white" />
                      <div className="bg-white" />
                      <div className="bg-white" />
                      <div className="bg-white" />
                      <div className="bg-white/20" />
                    </div>
                    <div className="mt-6 flex justify-between text-[10px] uppercase tracking-tight text-[#919191]">
                      <span>{card.footerLeft}</span>
                      <span>{card.footerRight}</span>
                    </div>
                  </>
                ) : null}

                {card.kind === "uptime" ? (
                  <>
                    <div className="flex h-8 items-end gap-1">
                      <div className="h-[20%] w-full bg-white/20" />
                      <div className="h-[40%] w-full bg-white/20" />
                      <div className="h-[30%] w-full bg-white/20" />
                      <div className="h-[60%] w-full bg-white/20" />
                      <div className="h-[20%] w-full bg-white/20" />
                      <div className="h-[90%] w-full bg-white/60" />
                      <div className="h-[100%] w-full bg-white" />
                    </div>
                    <div className="mt-6 flex justify-between text-[10px] uppercase tracking-tight text-[#919191]">
                      <span>{card.footerLeft}</span>
                      <span>{card.footerRight}</span>
                    </div>
                  </>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section id="terminal" className="border-y border-white/10 bg-white/5 py-24 md:py-32">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-16 px-8 lg:grid-cols-2 md:px-12">
            <div>
              <div className="mb-12">
                <span className="mb-2 block text-[10px] uppercase tracking-[0.4em] text-[#919191]">
                  LUMMA_ACTIVITY_LOG
                </span>
                <h2 className="font-display text-3xl font-bold uppercase tracking-tight text-white">
                  LIVE_SIGNAL_FEED
                </h2>
              </div>

              <div className="space-y-4 text-[11px] uppercase tracking-wider">
                {systemFeed.map((item) => (
                  <div
                    key={item.event}
                    className="group flex items-center justify-between border border-white/10 bg-black/40 p-4 transition-colors hover:bg-white/5"
                  >
                    <span className="text-white">{item.event}</span>
                    <span className="text-[#919191]">{item.time}</span>
                  </div>
                ))}
              </div>

              <button className="mt-8 w-full border border-[#919191]/30 py-4 text-[10px] font-display uppercase tracking-[0.4em] transition-all hover:bg-white/5">
                VIEW_FULL_ACTIVITY
              </button>
            </div>

            <div>
              <div className="mb-12">
                <span className="mb-2 block text-[10px] uppercase tracking-[0.4em] text-[#919191]">
                  YIELD_VAULTS
                </span>
                <h2 className="font-display text-3xl font-bold uppercase tracking-tight text-white">
                  TESTNET_COMMANDS
                </h2>
              </div>

              <div className="relative border border-white/10 bg-black/40 p-8 backdrop-blur-sm">
                <div className="mb-8 flex items-center gap-4">
                  <div className="h-2 w-2 animate-pulse bg-white" />
                  <span className="font-display text-xs uppercase tracking-widest text-white">
                    MODE: APP_TESTNET
                  </span>
                </div>

                <div className="mb-12 space-y-6">
                  <div className="flex items-end justify-between border-b border-white/10 pb-2">
                    <span className="text-[10px] uppercase tracking-widest text-[#919191]">Vault Types</span>
                    <span className="font-display text-2xl text-white">3 Rails</span>
                  </div>
                  <div className="flex items-end justify-between border-b border-white/10 pb-2">
                    <span className="text-[10px] uppercase tracking-widest text-[#919191]">Swap Pair</span>
                    <span className="font-display text-2xl text-white">USDC/EURC</span>
                  </div>
                  <div className="flex items-end justify-between border-b border-white/10 pb-2">
                    <span className="text-[10px] uppercase tracking-widest text-[#919191]">Wallet Auth</span>
                    <span className="font-display text-lg uppercase tracking-widest text-white">
                      PRIVY
                    </span>
                  </div>
                </div>

                <Link
                  href="https://testnet.lumma.xyz"
                  className="block w-full bg-white py-4 text-center font-display text-[11px] font-black uppercase tracking-[0.4em] text-black transition-all hover:bg-white/80 active:scale-95"
                >
                  ENTER_TESTNET
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden px-8 py-36 text-center md:px-12 md:py-48">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-8 font-display text-5xl font-black uppercase tracking-tight text-white md:text-6xl">
              START_EARNING_ON_TESTNET
            </h2>
            <p className="mx-auto mb-12 max-w-xl text-lg text-[#919191]/80">
              Lumma is stablecoin utility plus game loops: vaults, swaps, points, referrals, quests, and NFT rewards on Arc testnet.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="https://testnet.lumma.xyz"
                className="px-12 py-5 font-display text-xs font-black uppercase tracking-[0.4em] text-black transition-all hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] bg-white"
              >
                ENTER_TESTNET
              </Link>
              <Link
                href="https://docs.lumma.xyz"
                className="border border-white/20 px-12 py-5 font-display text-xs font-black uppercase tracking-[0.4em] text-white transition-all hover:bg-white/5"
              >
                READ_DOCS
              </Link>
            </div>
          </div>
        </section>
      </div>

      <footer className="relative z-50 overflow-hidden border-t border-white/10 bg-[#0a0a0a] px-8 pb-12 pt-20 md:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-24 grid grid-cols-1 gap-12 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="mb-6 font-display text-2xl font-black uppercase tracking-tight text-white">
                LUMMA//SYSTEMS
              </div>
              <p className="mb-8 max-w-sm text-xs uppercase tracking-wider text-[#919191]">
                Stablecoin utility with game loops. Deposit, swap, earn points, unlock referrals, complete quests, and claim NFT milestones.
              </p>
              <div className="flex gap-4">
                <div className="flex h-10 w-10 cursor-pointer items-center justify-center border border-white/10 text-white/50 transition-colors hover:text-white">
                  <span className="material-symbols-outlined text-lg">terminal</span>
                </div>
                <div className="flex h-10 w-10 cursor-pointer items-center justify-center border border-white/10 text-white/50 transition-colors hover:text-white">
                  <span className="material-symbols-outlined text-lg">code</span>
                </div>
                <div className="flex h-10 w-10 cursor-pointer items-center justify-center border border-white/10 text-white/50 transition-colors hover:text-white">
                  <span className="material-symbols-outlined text-lg">podcasts</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="mb-8 font-display text-[10px] font-black uppercase tracking-[0.4em] text-white">
                NAVIGATION
              </h4>
              <ul className="space-y-4 text-[10px] uppercase tracking-widest text-[#919191]">
                <li>
                  <a className="transition-colors hover:text-white" href="#network">
                    NETWORK_STATUS
                  </a>
                </li>
                <li>
                  <a className="transition-colors hover:text-white" href="#capabilities">
                    VAULT_SWAP_POINTS
                  </a>
                </li>
                <li>
                  <a className="transition-colors hover:text-white" href="#terminal">
                    ENTER_TESTNET
                  </a>
                </li>
                <li>
                  <a className="transition-colors hover:text-white" href="https://docs.lumma.xyz">
                    DOCS
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-8 font-display text-[10px] font-black uppercase tracking-[0.4em] text-white">
                RESOURCES
              </h4>
              <ul className="space-y-4 text-[10px] uppercase tracking-widest text-[#919191]">
                <li>
                  <a className="transition-colors hover:text-white" href="#">
                    BUILT_ON_ARC
                  </a>
                </li>
                <li>
                  <a className="transition-colors hover:text-white" href="#">
                    PRIVY_WALLET_AUTH
                  </a>
                </li>
                <li>
                  <a className="transition-colors hover:text-white" href="#">
                    USDC_GAS_MODEL
                  </a>
                </li>
                <li>
                  <a className="transition-colors hover:text-white" href="#">
                    STABLEFX_SWAP_RAIL
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-8 border-t border-white/5 pt-12 md:flex-row">
            <div className="text-[9px] uppercase tracking-[0.3em] text-[#919191]/50">
              ©2026 LUMMA_TESTNET // ARC_CHAIN // BUILD_HASH: 0xlumma
            </div>
            <div className="flex gap-8 text-[9px] uppercase tracking-[0.3em] text-[#919191]/50">
              <a className="transition-all hover:text-white" href="#">
                PRIVACY_ENCRYPTION
              </a>
              <a className="transition-all hover:text-white" href="#">
                TERM_OF_SERVICE
              </a>
              <a className="transition-all hover:text-white" href="#">
                DMCA_INTELLECTUAL
              </a>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </footer>
    </main>
  );
}



