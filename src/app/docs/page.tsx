import Link from "next/link";

const sections = [
  { id: "quickstart", label: "Quickstart" },
  { id: "arc-testnet", label: "Arc Testnet" },
  { id: "faucet", label: "Get Faucet Funds" },
  { id: "contracts", label: "Deploy Contracts" },
  { id: "supabase", label: "Supabase Setup" },
  { id: "dns", label: "Spaceship DNS" },
];

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_15%_15%,rgba(94,233,255,0.18),transparent_35%),radial-gradient(circle_at_85%_85%,rgba(198,255,92,0.2),transparent_35%),linear-gradient(150deg,#f7f4ea,#edf2f5)]">
      <div className="mx-auto max-w-5xl px-5 py-10">
        <header className="rounded-3xl border border-lumma-ink/15 bg-white/75 p-6 backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lumma-ink/70">
            Lumma Docs
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold text-lumma-ink">
            Launch Guide for Arc + Lumma
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-lumma-ink/80">
            This docs page is the canonical setup flow for app deployment, Arc testnet connectivity, contract deployment, and domain routing.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/app"
              className="rounded-xl bg-lumma-ink px-4 py-2 text-sm font-semibold text-lumma-sand"
            >
              Open App
            </Link>
            <a
              href="https://docs.arc.network/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-lumma-ink/25 px-4 py-2 text-sm font-semibold text-lumma-ink"
            >
              Arc Official Docs
            </a>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
          <aside className="h-fit rounded-2xl border border-lumma-ink/15 bg-white/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lumma-ink/60">
              Sections
            </p>
            <nav className="mt-3 flex flex-col gap-1.5">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="rounded-lg px-2 py-1.5 text-sm text-lumma-ink transition hover:bg-lumma-sand"
                >
                  {section.label}
                </a>
              ))}
            </nav>
          </aside>

          <div className="space-y-5">
            <DocCard id="quickstart" title="Quickstart">
              <p>
                Run locally:
              </p>
              <CodeBlock code={`npm install\nnpm run dev`} />
              <p>
                Production domains:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>`lumma.xyz` for landing</li>
                <li>`app.lumma.xyz` for production app</li>
                <li>`testnet.lumma.xyz` for staging app</li>
                <li>`docs.lumma.xyz` for this docs portal</li>
              </ul>
            </DocCard>

            <DocCard id="arc-testnet" title="Arc Testnet Network">
              <p>Use these Arc testnet details in wallets and env:</p>
              <CodeBlock
                code={`Network Name: Arc Testnet\nChain ID: 5042002\nCurrency: USDC\nRPC URL: https://rpc.testnet.arc.network\nExplorer: https://testnet.arcscan.app`}
              />
              <p className="text-sm text-lumma-ink/75">
                Source: Arc Connect guide.
              </p>
            </DocCard>

            <DocCard id="faucet" title="Get Faucet Funds (USDC for Gas)">
              <ol className="list-decimal space-y-1 pl-5">
                <li>Open Arc testnet faucet page.</li>
                <li>Connect your wallet on Arc testnet.</li>
                <li>Request test USDC (used as gas on Arc).</li>
                <li>Wait for transaction confirmation on Arc explorer.</li>
              </ol>
              <div className="mt-3">
                <a
                  href="https://faucet.arc.network/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-lumma-ink underline"
                >
                  Open Arc Faucet
                </a>
              </div>
            </DocCard>

            <DocCard id="contracts" title="Deploy Contracts to Arc Testnet">
              <p>Fast path using Remix:</p>
              <ol className="list-decimal space-y-1 pl-5">
                <li>Open Remix and import files from `contracts/src`.</li>
                <li>Compile with Solidity `0.8.24`.</li>
                <li>Connect wallet in Remix (Arc testnet network selected).</li>
                <li>Deploy `LummaVaultManager` first with USDC address + owner.</li>
                <li>Configure vault IDs using `keccak256` constants.</li>
                <li>Deploy `LummaMilestones` with owner address.</li>
              </ol>
              <p className="mt-3">Arc testnet stablecoin addresses:</p>
              <CodeBlock
                code={`USDC (ERC-20 interface): 0x3600000000000000000000000000000000000000\nEURC: 0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a`}
              />
              <p className="mt-3 text-sm text-lumma-ink/75">
                You can also use Foundry deploy flow from Arc docs if preferred.
              </p>
            </DocCard>

            <DocCard id="supabase" title="Supabase Setup for Lumma">
              <p>
                Local env already populated with your provided public keys in `.env.local`.
              </p>
              <p className="mt-2">
                Required next step: add `SUPABASE_SERVICE_ROLE_KEY` (server-side only) in Vercel and local env.
              </p>
              <CodeBlock
                code={`NEXT_PUBLIC_SUPABASE_URL=https://ccdnqxdfkbxfjtfrvzrc.supabase.co\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...\nNEXT_PUBLIC_SUPABASE_ANON_KEY=...\nSUPABASE_SERVICE_ROLE_KEY=...`}
              />
            </DocCard>

            <DocCard id="dns" title="Spaceship DNS + Vercel Mapping">
              <p>Create these DNS records in Spaceship for `lumma.xyz`:</p>
              <CodeBlock
                code={`A      @        76.76.21.21\nCNAME  app      cname.vercel-dns.com\nCNAME  testnet  cname.vercel-dns.com\nCNAME  docs     cname.vercel-dns.com`}
              />
              <p className="mt-2">
                Then in Vercel add all four domains:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>`lumma.xyz`</li>
                <li>`app.lumma.xyz`</li>
                <li>`testnet.lumma.xyz`</li>
                <li>`docs.lumma.xyz`</li>
              </ul>
              <p className="mt-2 text-sm text-lumma-ink/75">
                This repo rewrites hosts so `app.*` lands on `/app` and `docs.*` lands on `/docs`.
              </p>
            </DocCard>
          </div>
        </div>
      </div>
    </main>
  );
}

function DocCard({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="rounded-2xl border border-lumma-ink/15 bg-white/80 p-5 text-sm text-lumma-ink/90"
    >
      <h2 className="font-display text-2xl font-semibold text-lumma-ink">{title}</h2>
      <div className="mt-3 space-y-2 leading-relaxed">{children}</div>
    </section>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl bg-lumma-ink p-4 text-xs text-lumma-sand">
      <code>{code}</code>
    </pre>
  );
}

