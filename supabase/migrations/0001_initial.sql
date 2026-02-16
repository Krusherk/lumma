create extension if not exists "pgcrypto";

create type vault_risk as enum ('conservative', 'balanced', 'aggressive');
create type task_type as enum ('daily', 'social', 'activity', 'quest');
create type leaderboard_period as enum ('weekly', 'monthly', 'all_time');
create type nft_tier as enum ('bronze', 'silver', 'gold', 'diamond', 'special');
create type risk_flag as enum ('none', 'review', 'blocked');

create table if not exists users (
  id text primary key,
  wallet_address text,
  referral_code text unique not null,
  referred_by text references users(id),
  points_settled numeric(18,2) not null default 0,
  points_pending numeric(18,2) not null default 0,
  risk_flag risk_flag not null default 'none',
  created_at timestamptz not null default now()
);

create table if not exists wallets (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  chain_id integer not null,
  address text not null,
  is_embedded boolean not null default false,
  created_at timestamptz not null default now(),
  unique(chain_id, address)
);

create table if not exists vault_positions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  vault_id text not null,
  risk vault_risk not null,
  principal_usd numeric(18,2) not null default 0,
  earned_usd numeric(18,2) not null default 0,
  last_accrued_at timestamptz not null default now(),
  unique(user_id, vault_id)
);

create table if not exists vault_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  vault_id text not null,
  action text not null check (action in ('deposit', 'withdraw')),
  amount numeric(18,2) not null,
  tx_hash text,
  created_at timestamptz not null default now()
);

create table if not exists swap_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  from_asset text not null,
  to_asset text not null,
  amount numeric(18,6) not null,
  rate numeric(18,8) not null,
  out_amount numeric(18,6) not null,
  tx_hash text,
  created_at timestamptz not null default now()
);

create table if not exists point_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  key text not null,
  task_type task_type not null,
  points numeric(18,2) not null,
  status text not null check (status in ('pending', 'settled', 'blocked')),
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  settles_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id text not null references users(id) on delete cascade,
  referred_user_id text not null references users(id) on delete cascade,
  rewards_enabled_at timestamptz,
  created_at timestamptz not null default now(),
  unique(referred_user_id)
);

create table if not exists referral_rewards (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id text not null references users(id) on delete cascade,
  source_user_id text not null references users(id) on delete cascade,
  source_event_id uuid references point_events(id),
  points numeric(18,2) not null,
  created_at timestamptz not null default now()
);

create table if not exists nft_claims (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  tier nft_tier not null,
  token_id bigint,
  tx_hash text,
  claimed_at timestamptz not null default now(),
  unique(user_id, tier)
);

create table if not exists quest_runs (
  id uuid primary key default gen_random_uuid(),
  quest_id text not null,
  user_id text not null references users(id) on delete cascade,
  status text not null check (status in ('in_progress', 'completed')),
  progress jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(quest_id, user_id)
);

create table if not exists social_proofs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  proof_type text not null,
  proof_url text,
  status text not null check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists abuse_flags (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  signal text not null,
  score integer not null,
  created_at timestamptz not null default now()
);

create table if not exists leaderboard_snapshots (
  id uuid primary key default gen_random_uuid(),
  period leaderboard_period not null,
  rows jsonb not null default '[]'::jsonb,
  captured_at timestamptz not null default now()
);

create index if not exists idx_users_referral_code on users(referral_code);
create index if not exists idx_vault_events_user_id on vault_events(user_id);
create index if not exists idx_swap_events_user_id on swap_events(user_id);
create index if not exists idx_point_events_user_id_created on point_events(user_id, created_at desc);
create index if not exists idx_referrals_referrer on referrals(referrer_user_id);
create index if not exists idx_quest_runs_user on quest_runs(user_id);

