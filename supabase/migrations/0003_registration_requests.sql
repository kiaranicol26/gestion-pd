-- Queue for registration requests submitted by the website.
-- Only the trusted Discord bot worker can read or update this table.
create table public.registration_requests (
  id uuid primary key default gen_random_uuid(),
  requested_username text not null,
  normalized_username text not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  result_message text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '10 minutes')
);

create index registration_requests_pending_idx
  on public.registration_requests (created_at)
  where status = 'pending';

create index registration_requests_username_idx
  on public.registration_requests (normalized_username, created_at desc);

create unique index registration_requests_one_active_username
  on public.registration_requests (normalized_username)
  where status in ('pending', 'processing');

alter table public.registration_requests enable row level security;
revoke all on public.registration_requests from public, anon, authenticated;
grant all on public.registration_requests to service_role;
