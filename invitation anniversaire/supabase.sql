-- Schéma Supabase pour l'invitation d'anniversaire
-- À exécuter une seule fois dans l'éditeur SQL Supabase.

create table if not exists public.invites (
  id bigserial primary key,
  nom text not null,
  code_secret text not null unique,
  table_num integer default 0,
  nb_couverts integer default 1,
  menu text default 'standard',
  code_utilise boolean not null default false,
  statut text not null default 'en_attente'
    check (statut in ('en_attente', 'accepte', 'refuse')),
  date_reponse text,
  boisson text,
  ip_connexion text,
  acces_count integer not null default 0,
  presente boolean not null default false,
  date_presence text,
  acces_max integer not null default 5,
  created_at timestamptz not null default now()
);

create table if not exists public.logs_securite (
  id bigserial primary key,
  type text not null,
  code_tente text,
  nom_tente text,
  ip text,
  message text,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions_admin (
  id bigserial primary key,
  token text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists invites_code_secret_idx on public.invites (upper(code_secret));
create index if not exists invites_statut_idx on public.invites (statut);
create index if not exists invites_presente_idx on public.invites (presente);
create index if not exists logs_securite_created_at_idx on public.logs_securite (created_at desc);
