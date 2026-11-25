-- Northem platform: core tenancy, people and roles.
--
-- One Supabase project serves every Northem app: the landing site, the four
-- division sites, portal and admin. Every business row carries org_id so the
-- same database can host other production houses later (whitelabel). Northem
-- is simply the first org.
--
-- Roles are Postgres enums on purpose: enum values compare by declaration
-- order, so "role >= 'crew'" reads the way it sounds. Never reorder them;
-- add new values with ALTER TYPE ... ADD VALUE ... BEFORE/AFTER.

-- Supabase keeps pgcrypto in the "extensions" schema; functions that hash
-- tokens put it on their search_path.
create extension if not exists pgcrypto;
create extension if not exists citext;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

-- Org-wide role. UI labels: Guest, Press, Cast, Crew, Director / producer, Admin, Owner.
create type org_role as enum ('guest', 'press', 'cast', 'crew', 'producer', 'admin', 'owner');

-- Role inside one project. 'head' is a head of department, 'lead' runs the
-- project (director, producer, project lead). Org admins act as 'lead' everywhere.
create type project_role as enum ('guest', 'cast', 'crew', 'head', 'lead');

create type member_status as enum ('active', 'suspended', 'left');

create type project_visibility as enum (
  'private',   -- project members only
  'internal',  -- everyone in the org
  'unlisted',  -- public page reachable by link, not listed
  'public'     -- listed on the division site and searchable
);

-- ---------------------------------------------------------------------------
-- Shared trigger: updated_at
-- ---------------------------------------------------------------------------

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Orgs (tenants)
-- ---------------------------------------------------------------------------

create table orgs (
  id uuid primary key default gen_random_uuid(),
  slug citext not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,40}$'),
  name text not null,
  -- Whitelabel branding for portal/admin: logo, colours, product name, mail sender.
  branding jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  plan text not null default 'internal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger orgs_updated before update on orgs for each row execute function set_updated_at();

-- Which host belongs to which org and which app, so one deployment can serve
-- portal.northem.group and intranet.someotherstudio.com alike.
create table org_domains (
  host citext primary key,
  org_id uuid not null references orgs(id) on delete cascade,
  app text not null check (app in ('landing', 'division', 'portal', 'admin', 'project')),
  division_id uuid,  -- set for division sites; FK added below
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index org_domains_org_idx on org_domains(org_id);

-- Divisions: Northem Productions, Northem Development, Specprod, SoNorthem.
-- Each has its own site and theme; another tenant may have none or many.
create table divisions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  slug citext not null,
  name text not null,
  tagline text,
  description text,
  theme jsonb not null default '{}'::jsonb,
  sort int not null default 0,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, slug)
);
create trigger divisions_updated before update on divisions for each row execute function set_updated_at();
alter table org_domains add constraint org_domains_division_fk
  foreign key (division_id) references divisions(id) on delete set null;

-- ---------------------------------------------------------------------------
-- Profiles: one per auth user, owned and customised by that user.
-- Email lives only in auth.users and is never exposed through this table.
-- ---------------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle citext unique check (handle ~ '^[a-z0-9][a-z0-9_.-]{1,30}$'),
  display_name text not null default '',
  headline text,               -- "Gaffer, cold-weather specialist"
  bio text,
  avatar_url text,
  cover_url text,
  location text,
  links jsonb not null default '[]'::jsonb,   -- [{label, url}]
  theme jsonb not null default '{}'::jsonb,   -- their own profile page theme
  is_public boolean not null default true,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on profiles for each row execute function set_updated_at();

-- Every new auth user gets a profile row.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- Org membership and permissions
-- ---------------------------------------------------------------------------

create table org_members (
  org_id uuid not null references orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role org_role not null default 'guest',
  title text,                                   -- "Head of Development"
  departments text[] not null default '{}',     -- camera, sound, art, dev, ...
  status member_status not null default 'active',
  joined_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index org_members_user_idx on org_members(user_id);

-- Capabilities an admin can toggle per role in the admin app. Owners always
-- have every capability, so an org can never lock itself out.
-- Known perms (the admin UI lists these):
--   projects.create  projects.manage_all  people.manage  people.invite
--   forms.read  forms.manage  openings.manage  chat.create_channel
--   chat.moderate  sites.edit  podcasts.publish  integrations.manage
--   roles.manage  audit.read
create table role_permissions (
  org_id uuid not null references orgs(id) on delete cascade,
  role org_role not null,
  perm text not null,
  primary key (org_id, role, perm)
);

-- Defaults for a new org; admins edit from there.
create or replace function seed_role_permissions(p_org uuid) returns void
language sql security definer set search_path = public as $$
  insert into role_permissions (org_id, role, perm)
  select p_org, r::org_role, p from (values
    ('admin', 'projects.create'), ('admin', 'projects.manage_all'), ('admin', 'people.manage'),
    ('admin', 'people.invite'), ('admin', 'forms.read'), ('admin', 'forms.manage'),
    ('admin', 'openings.manage'), ('admin', 'chat.create_channel'), ('admin', 'chat.moderate'),
    ('admin', 'sites.edit'), ('admin', 'podcasts.publish'), ('admin', 'integrations.manage'),
    ('admin', 'audit.read'),
    ('producer', 'projects.create'), ('producer', 'people.invite'), ('producer', 'forms.read'),
    ('producer', 'openings.manage'), ('producer', 'chat.create_channel'), ('producer', 'podcasts.publish'),
    ('crew', 'chat.create_channel')
  ) as d(r, p)
  on conflict do nothing;
$$;

create or replace function orgs_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform seed_role_permissions(new.id);
  return new;
end $$;
create trigger orgs_seed_perms after insert on orgs for each row execute function orgs_after_insert();

-- ---------------------------------------------------------------------------
-- People: anyone who can be credited. A person need not have an account;
-- when they join, their auth profile is linked (profile_id) and they can
-- edit the public parts themselves. Scoped per org so tenants stay apart.
-- ---------------------------------------------------------------------------

create table people (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  slug citext not null check (slug ~ '^[a-z0-9][a-z0-9-]{0,60}$'),
  name text not null,
  known_for text,           -- "Cinematographer", shown under the name
  bio text,
  photo_url text,
  links jsonb not null default '[]'::jsonb,
  profile_id uuid references profiles(id) on delete set null,
  is_public boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, slug),
  unique (org_id, profile_id)
);
create trigger people_updated before update on people for each row execute function set_updated_at();
create index people_profile_idx on people(profile_id);
create index people_name_fts_idx on people using gin (to_tsvector('simple', name));
