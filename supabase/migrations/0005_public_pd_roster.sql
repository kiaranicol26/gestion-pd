-- Public, read-only PD roster. Sensitive Discord identifiers and salary data stay private.
alter table public.pd_members
  add column if not exists division_3 boolean not null default false;

create or replace view public.public_pd_roster
with (security_barrier = true)
as
select
  id,
  full_name,
  callsign,
  rank_code,
  rank_name,
  photo_url,
  division_1,
  division_2,
  division_3,
  is_instructor,
  discord_joined_at
from public.pd_members
where status = 'active';

revoke all on public.public_pd_roster from public;
grant select on public.public_pd_roster to anon, authenticated;
