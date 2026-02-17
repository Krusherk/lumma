alter table public.users
  add column if not exists username text;

create unique index if not exists idx_users_username_lower_unique
  on public.users ((lower(username)))
  where username is not null;

