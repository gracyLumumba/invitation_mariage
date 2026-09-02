-- Supabase schema for the anniversary project
-- Paste this into the Supabase SQL editor and run it once.

create extension if not exists pgcrypto;

create table if not exists public.visitors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  login_count integer not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'present', 'absent')),
  login_at timestamptz,
  rsvp_at timestamptz,
  last_ip text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null references public.visitors(id) on delete cascade,
  type text not null
    check (type in ('login', 'rsvp', 'admin_login')),
  name text not null,
  status text,
  ip text,
  created_at timestamptz not null default now()
);

create index if not exists visitors_status_idx on public.visitors (status);
create index if not exists visitors_login_at_idx on public.visitors (login_at desc nulls last);
create index if not exists events_visitor_id_idx on public.events (visitor_id);
create index if not exists events_created_at_idx on public.events (created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_visitors_set_updated_at on public.visitors;
create trigger trg_visitors_set_updated_at
before update on public.visitors
for each row
execute function public.set_updated_at();

-- Optional: seed one example visitor if you want to test quickly.
-- insert into public.visitors (name) values ('Test Guest');
