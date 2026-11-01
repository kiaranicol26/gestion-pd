-- Password-only login support. Passwords are generated server-side by the Discord bot
-- and stored as keyed digests; plaintext is returned only once to the bot for DM delivery.
create table public.login_credentials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  password_digest text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.login_credentials enable row level security;
revoke all on public.login_credentials from anon, authenticated;
grant all on public.login_credentials to service_role;
