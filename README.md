# Lumma (Built on Arc)

Lumma is a Next.js + TypeScript app for Arc testnet:
- Yield vaults with modeled APY bands
- USDC/EURC swap flow
- Points + referral engine with strict anti-sybil controls
- Milestone NFT claims
- Weekly Yield Quests

## Tech Stack
- Next.js App Router
- Tailwind CSS v4
- Privy auth + embedded wallets
- Supabase schema (migration included)
- Solidity contracts (vault manager + milestone NFT)
- Discord bootstrap bot (roles/channels/rules/welcome)

## Local Setup
1. Install dependencies:
```bash
npm install
```
2. Copy envs:
```bash
cp .env.example .env.local
```
3. Run Supabase migrations in SQL editor (in order):
- `supabase/migrations/0001_initial.sql`
- `supabase/migrations/0002_usernames.sql`
- `supabase/migrations/0003_system_flags.sql`
4. Start dev server:
```bash
npm run dev
```
5. Open:
- Marketing: `http://localhost:3000`
- App dashboard: `http://localhost:3000/app`
- Docs portal: `http://localhost:3000/docs`
- Admin pause panel: `http://localhost:3000/admin`

## Scripts
- `npm run dev` - start local app
- `npm run lint` - run ESLint
- `npm run test` - run Vitest
- `npm run build` - production build
- `npm run bot:discord` - start Discord bot

## API Endpoints
- `POST /api/auth/privy/verify`
- `GET /api/vaults`
- `POST /api/vaults/deposit`
- `POST /api/vaults/withdraw`
- `GET /api/swap/quote`
- `POST /api/swap/execute`
- `GET /api/swaps/history`
- `POST /api/points/event`
- `GET /api/leaderboard`
- `POST /api/referrals/apply`
- `GET /api/referrals/stats`
- `POST /api/nft/claim`
- `GET /api/quests/active`
- `POST /api/quests/complete`

## Deploy Notes
- Domain and Vercel guide: `docs/DOMAIN_VERCEL_SETUP.md`
- Brand system: `docs/BRAND_GUIDELINES.md`
- Social launch playbook: `docs/SOCIAL_LAUNCH.md`
- Secret rotation checklist: `docs/SECURITY_ROTATION.md`

## Security
- Rotate exposed Privy secret before deployment.
- Keep `PRIVY_APP_SECRET` server-only.
- Use `ADMIN_API_TOKEN` for vault pause endpoint.
- Set `DEPLOYER_PRIVATE_KEY` only in secure server environments (for owner-gated NFT mint flow).
