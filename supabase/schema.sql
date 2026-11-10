-- Website.xy Supabase schema
-- Run this whole file in Supabase SQL Editor. Promote your own account to admin only after signup.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  reference_id text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  service text not null,
  purpose text not null,
  reference_notes text,
  budget text,
  timeline text,
  contact text not null,
  status text not null default 'Pending' check (status in ('Pending','Processing','Completed','Rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Safely migrate the earlier column name if the old schema was already installed.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'applications' and column_name = 'references'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'applications' and column_name = 'reference_notes'
  ) then
    alter table public.applications rename column "references" to reference_notes;
  end if;
end;
$;

create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  name text not null,
  description text,
  price text,
  image_url text,
  availability text not null default 'Available',
  details jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists applications_set_updated_at on public.applications;
create trigger applications_set_updated_at
before update on public.applications
for each row execute function public.set_updated_at();

drop trigger if exists catalog_items_set_updated_at on public.catalog_items;
create trigger catalog_items_set_updated_at
before update on public.catalog_items
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.applications enable row level security;
alter table public.catalog_items enable row level security;

drop policy if exists "Customers read own profile" on public.profiles;
drop policy if exists "Customers update own display name" on public.profiles;
drop policy if exists "Admins manage profiles" on public.profiles;
drop policy if exists "Customers submit own applications" on public.applications;
drop policy if exists "Customers read own applications" on public.applications;
drop policy if exists "Admins update applications" on public.applications;
drop policy if exists "Admins delete applications" on public.applications;
drop policy if exists "Anyone can view active catalogue" on public.catalog_items;
drop policy if exists "Admins manage catalogue" on public.catalog_items;

create policy "Customers read own profile"
on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());

create policy "Customers update own display name"
on public.profiles for update to authenticated
using (id = auth.uid() and role = 'customer')
with check (id = auth.uid() and role = 'customer');

create policy "Admins manage profiles"
on public.profiles for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Customers submit own applications"
on public.applications for insert to authenticated
with check (user_id = auth.uid());

create policy "Customers read own applications"
on public.applications for select to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "Admins update applications"
on public.applications for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins delete applications"
on public.applications for delete to authenticated
using (public.is_admin());

create policy "Anyone can view active catalogue"
on public.catalog_items for select to anon, authenticated
using (active = true or public.is_admin());

create policy "Admins manage catalogue"
on public.catalog_items for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Create a customer profile automatically for every new email or Google account.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'display_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill profiles for accounts created before this trigger was installed.
insert into public.profiles (id, display_name)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'display_name', '')
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;


-- ADMIN SETUP:
-- 1. Create your own account on the website and verify/sign in.
-- 2. Run: select id, email from auth.users;
-- 3. Copy YOUR account UUID and run the statement below with that UUID:
-- update public.profiles set role = 'admin' where id = 'YOUR_AUTH_USER_UUID';
-- Never put a Supabase service_role key or database password in frontend code.
