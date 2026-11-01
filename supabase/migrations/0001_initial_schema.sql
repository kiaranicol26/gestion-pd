-- Gestión PD — initial schema
-- Apply through Supabase SQL Editor or Supabase CLI.
-- Discord OAuth is configured in Supabase Auth dashboard; never place provider secrets here.

create extension if not exists pgcrypto;

create type public.admin_role as enum ('owner', 'admin', 'editor', 'viewer');
create type public.member_status as enum ('active', 'disabled');
create type public.salary_period_status as enum ('open', 'closed');
create type public.payment_status as enum ('unpaid', 'paid');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  discord_id text unique not null,
  discord_username text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.administrators (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role public.admin_role not null default 'viewer',
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.pd_members (
  id uuid primary key default gen_random_uuid(),
  discord_id text unique,
  full_name text not null,
  callsign text unique,
  rank_code text,
  rank_name text,
  photo_url text,
  status public.member_status not null default 'active',
  base_pay numeric(12,2) not null default 0 check (base_pay >= 0),
  division_1 boolean not null default false,
  division_2 boolean not null default false,
  is_instructor boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.training_catalog (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.training_catalog (code, name, sort_order)
values ('M4','M4',1), ('EDC','EDC',2), ('MARY','MARY',3), ('AIR','AIR',4)
on conflict (code) do nothing;

create table public.member_trainings (
  member_id uuid not null references public.pd_members(id) on delete cascade,
  training_id uuid not null references public.training_catalog(id) on delete restrict,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  primary key (member_id, training_id)
);

create table public.salary_periods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_on date,
  ends_on date,
  status public.salary_period_status not null default 'open',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  closed_by uuid references public.profiles(id),
  closed_at timestamptz,
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create table public.salary_payments (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.salary_periods(id) on delete restrict,
  member_id uuid not null references public.pd_members(id) on delete restrict,
  member_name_snapshot text not null,
  rank_snapshot text,
  base_pay_snapshot numeric(12,2) not null default 0,
  division_1_snapshot boolean not null default false,
  division_2_snapshot boolean not null default false,
  instructor_snapshot boolean not null default false,
  division_1_bonus numeric(12,2) not null default 10,
  division_2_bonus numeric(12,2) not null default 10,
  instructor_bonus numeric(12,2) not null default 10,
  total_amount numeric(12,2) generated always as (
    base_pay_snapshot
    + case when division_1_snapshot then division_1_bonus else 0 end
    + case when division_2_snapshot then division_2_bonus else 0 end
    + case when instructor_snapshot then instructor_bonus else 0 end
  ) stored,
  payment_status public.payment_status not null default 'unpaid',
  paid_at timestamptz,
  paid_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (period_id, member_id)
);

create table public.access_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  discord_id text,
  purpose text not null check (purpose in ('initial_owner','registration')),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index pd_members_status_idx on public.pd_members(status);
create index salary_periods_created_idx on public.salary_periods(created_at desc);
create index salary_payments_period_idx on public.salary_payments(period_id);
create index audit_logs_created_idx on public.audit_logs(created_at desc);

-- Authorization helpers. Only active administrator records grant access.
create or replace function public.current_admin_role()
returns public.admin_role
language sql stable security definer
set search_path = public
as $$
  select role from public.administrators
  where user_id = auth.uid() and is_active = true
  limit 1;
$$;

create or replace function public.has_admin_role(required_roles public.admin_role[])
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(public.current_admin_role() = any(required_roles), false);
$$;

alter table public.profiles enable row level security;
alter table public.administrators enable row level security;
alter table public.pd_members enable row level security;
alter table public.training_catalog enable row level security;
alter table public.member_trainings enable row level security;
alter table public.salary_periods enable row level security;
alter table public.salary_payments enable row level security;
alter table public.access_codes enable row level security;
alter table public.audit_logs enable row level security;

-- Authenticated users can see their own profile. Admins can inspect profiles.
create policy "profiles_read_self_or_admin" on public.profiles
for select to authenticated
using (id = auth.uid() or public.has_admin_role(array['owner','admin']::public.admin_role[]));

create policy "admins_read_admins" on public.administrators
for select to authenticated
using (user_id = auth.uid() or public.has_admin_role(array['owner','admin']::public.admin_role[]));

create policy "admins_manage_owner" on public.administrators
for all to authenticated
using (public.has_admin_role(array['owner']::public.admin_role[]))
with check (public.has_admin_role(array['owner']::public.admin_role[]));

create policy "members_read_authenticated" on public.pd_members
for select to authenticated using (true);

create policy "members_edit_authorized" on public.pd_members
for update to authenticated
using (public.has_admin_role(array['owner','admin','editor']::public.admin_role[]))
with check (public.has_admin_role(array['owner','admin','editor']::public.admin_role[]));

create policy "members_insert_admin" on public.pd_members
for insert to authenticated
with check (public.has_admin_role(array['owner','admin']::public.admin_role[]));

create policy "members_delete_owner_admin" on public.pd_members
for delete to authenticated
using (public.has_admin_role(array['owner','admin']::public.admin_role[]));

create policy "training_read_authenticated" on public.training_catalog
for select to authenticated using (true);

create policy "training_manage_admin" on public.training_catalog
for all to authenticated
using (public.has_admin_role(array['owner','admin']::public.admin_role[]))
with check (public.has_admin_role(array['owner','admin']::public.admin_role[]));

create policy "member_trainings_read_authenticated" on public.member_trainings
for select to authenticated using (true);

create policy "member_trainings_edit" on public.member_trainings
for all to authenticated
using (public.has_admin_role(array['owner','admin','editor']::public.admin_role[]))
with check (public.has_admin_role(array['owner','admin','editor']::public.admin_role[]));

create policy "salary_periods_read_authenticated" on public.salary_periods
for select to authenticated using (true);

create policy "salary_periods_create_admin" on public.salary_periods
for insert to authenticated
with check (public.has_admin_role(array['owner','admin']::public.admin_role[]));

create policy "salary_periods_update_admin" on public.salary_periods
for update to authenticated
using (public.has_admin_role(array['owner','admin']::public.admin_role[]))
with check (public.has_admin_role(array['owner','admin']::public.admin_role[]));

create policy "salary_payments_read_authenticated" on public.salary_payments
for select to authenticated using (true);

create policy "salary_payments_create_admin" on public.salary_payments
for insert to authenticated
with check (public.has_admin_role(array['owner','admin']::public.admin_role[]));

create policy "salary_payments_update_admin" on public.salary_payments
for update to authenticated
using (public.has_admin_role(array['owner','admin']::public.admin_role[]))
with check (public.has_admin_role(array['owner','admin']::public.admin_role[]));

create policy "access_codes_owner_admin" on public.access_codes
for all to authenticated
using (public.has_admin_role(array['owner','admin']::public.admin_role[]))
with check (public.has_admin_role(array['owner','admin']::public.admin_role[]));

create policy "audit_logs_read_admin" on public.audit_logs
for select to authenticated
using (public.has_admin_role(array['owner','admin']::public.admin_role[]));

create policy "audit_logs_insert_authenticated" on public.audit_logs
for insert to authenticated with check (actor_id = auth.uid());

-- Do not grant anonymous access. Public registration will be mediated by a
-- server-side Edge Function after Discord identity and one-time code validation.
revoke all on all tables in schema public from anon;


-- Create a profile automatically after a Discord OAuth sign-in.
-- Discord's provider_id is the stable external account identifier.
create or replace function public.handle_new_discord_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  external_discord_id text;
begin
  external_discord_id := coalesce(
    new.raw_user_meta_data ->> 'provider_id',
    new.raw_user_meta_data ->> 'sub'
  );

  if external_discord_id is null or external_discord_id = '' then
    raise exception 'Discord provider ID is missing from OAuth user metadata';
  end if;

  insert into public.profiles (id, discord_id, discord_username, avatar_url)
  values (
    new.id,
    external_discord_id,
    coalesce(new.raw_user_meta_data ->> 'user_name', new.raw_user_meta_data ->> 'full_name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update set
    discord_id = excluded.discord_id,
    discord_username = excluded.discord_username,
    avatar_url = excluded.avatar_url,
    updated_at = now();

  return new;
end;
$$;

create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute procedure public.handle_new_discord_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute procedure public.set_updated_at();

create trigger pd_members_set_updated_at before update on public.pd_members
for each row execute procedure public.set_updated_at();
