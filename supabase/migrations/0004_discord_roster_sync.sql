-- Add Discord source fields used by the automatic roster synchronization.
alter table public.pd_members
  add column if not exists discord_nickname text,
  add column if not exists discord_joined_at timestamptz;

create index if not exists pd_members_discord_joined_at_idx
  on public.pd_members(discord_joined_at);
