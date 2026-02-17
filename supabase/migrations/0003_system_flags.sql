create table if not exists public.system_flags (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.system_flags (key, value)
values ('vault_pause', '{"paused": false}'::jsonb)
on conflict (key) do nothing;
