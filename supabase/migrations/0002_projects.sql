-- Projects and everything hanging off them: members, credits, the "real side"
-- of a production (media, bloopers, trivia, diary moments, podcasts),
-- internal documents, and links to Screenplay Studio and Graphite.

create type project_kind as enum (
  'feature', 'short', 'documentary', 'series', 'episode', 'commercial', 'music_video',
  'branded', 'social', 'specialty_shoot',            -- productions, Specprod, SoNorthem
  'website', 'app', 'tool', 'platform', 'game',       -- development
  'other'
);

create type project_status as enum (
  'idea', 'development', 'pre_production', 'production', 'post_production',
  'building', 'beta', 'released', 'live', 'on_hold', 'archived'
);

-- Reusable themes for public project pages, built by hand in admin.
-- tokens: colours, fonts, radii, grain, motion. layout: hero style, section order.
create table themes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null,
  tokens jsonb not null default '{}'::jsonb,
  layout jsonb not null default '{}'::jsonb,
  custom_css text,          -- sanitised and scoped server-side before render
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger themes_updated before update on themes for each row execute function set_updated_at();

create table projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  division_id uuid references divisions(id) on delete set null,
  slug citext not null check (slug ~ '^[a-z0-9][a-z0-9-]{0,80}$'),
  title text not null,
  kind project_kind not null default 'other',
  status project_status not null default 'idea',
  logline text,
  synopsis text,
  year int,
  release_date date,
  runtime_minutes int,
  locations text[] not null default '{}',
  genres text[] not null default '{}',
  poster_url text,
  cover_url text,
  trailer_url text,
  client text,                       -- for commercial/dev work, shown only if allowed
  visibility project_visibility not null default 'private',
  published_at timestamptz,          -- public page goes live when set and visibility allows
  theme_id uuid references themes(id) on delete set null,
  theme_overrides jsonb not null default '{}'::jsonb,
  page_blocks jsonb not null default '[]'::jsonb,   -- hand-built public page sections, in order
  stats jsonb not null default '{}'::jsonb,          -- "days in -30", "km hiked", fun numbers
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, slug)
);
create trigger projects_updated before update on projects for each row execute function set_updated_at();
create index projects_org_idx on projects(org_id, division_id);
create index projects_public_idx on projects(org_id, visibility) where published_at is not null;

create table project_members (
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role project_role not null default 'crew',
  departments text[] not null default '{}',
  title text,                         -- "1st AC", "Backend lead"
  added_by uuid references auth.users(id) on delete set null,
  added_at timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index project_members_user_idx on project_members(user_id);

-- ---------------------------------------------------------------------------
-- Credits: who did what. Clicking a credited person on a public page opens
-- their filmography, which is just their credits on public projects.
-- ---------------------------------------------------------------------------

create table credits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  department text not null,          -- directing, writing, cast, camera, sound, dev, ...
  job text not null,                 -- "Director", "Drone pilot", "Frontend"
  character_name text,               -- cast only
  billing int not null default 100,  -- lower sorts first
  note text,                         -- "uncredited", "episodes 1-3", a fun aside
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);
create index credits_project_idx on credits(project_id, department, billing);
create index credits_person_idx on credits(person_id);

-- ---------------------------------------------------------------------------
-- The real side of a production
-- ---------------------------------------------------------------------------

create type media_kind as enum ('still', 'bts', 'blooper', 'poster', 'concept', 'video', 'screenshot', 'audio');

create table media (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  kind media_kind not null default 'still',
  storage_path text,                 -- in the 'public-media' or 'project-files' bucket
  external_url text,                 -- or YouTube/Vimeo/etc.
  caption text,
  story text,                        -- the longer "what happened here"
  taken_at date,
  location text,
  photographer_id uuid references people(id) on delete set null,
  width int, height int, blurhash text,
  sort int not null default 0,
  is_public boolean not null default false,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (storage_path is not null or external_url is not null)
);
create index media_project_idx on media(project_id, kind, sort);

-- People tagged in a photo or blooper, so it shows on their profile too.
create table media_people (
  media_id uuid not null references media(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  primary key (media_id, person_id)
);

create type trivia_kind as enum ('trivia', 'goof', 'quote', 'fun_fact', 'confession');

create table trivia (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  kind trivia_kind not null default 'trivia',
  body text not null,
  person_id uuid references people(id) on delete set null,  -- who said it / who it's about
  sort int not null default 0,
  is_public boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index trivia_project_idx on trivia(project_id, sort);

-- Diary of the production: dated moments with text and media, the timeline
-- of a shoot or a build. The public page can show them as a journey.
create table moments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  happened_on date not null default current_date,
  title text not null,
  body text,
  media_ids uuid[] not null default '{}',
  mood text,                         -- emoji or short word
  is_public boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index moments_project_idx on moments(project_id, happened_on);

-- Podcast episodes about a project: hosted by us or linked from elsewhere.
create table podcast_episodes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,   -- null = general episode
  title text not null,
  description text,
  source text not null check (source in ('internal', 'spotify', 'youtube', 'apple', 'soundcloud', 'other')),
  storage_path text,                 -- internal audio/video in 'public-media'
  external_url text,
  duration_seconds int,
  episode_number int,
  cover_url text,
  published_at timestamptz,
  is_public boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check ((source = 'internal' and storage_path is not null) or (source <> 'internal' and external_url is not null))
);
create index podcast_project_idx on podcast_episodes(project_id, published_at desc);

create table podcast_guests (
  episode_id uuid not null references podcast_episodes(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  role text not null default 'guest' check (role in ('host', 'guest')),
  primary key (episode_id, person_id)
);

-- ---------------------------------------------------------------------------
-- Internal documents and outside links
-- ---------------------------------------------------------------------------

-- A document is a file we store, a plain link, or a pointer into Screenplay
-- Studio or Graphite. min_role and departments control who sees it, so cast
-- get the sides and call sheets but not the budget.
create table documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  category text not null default 'general',  -- script, schedule, callsheet, budget, contract, spec, ...
  source text not null check (source in ('upload', 'link', 'screenplay_studio', 'graphite')),
  storage_path text,
  url text,
  external_id text,                  -- SPS script/document id, Graphite page id
  min_role project_role not null default 'crew',
  departments text[] not null default '{}',  -- empty = every department
  pinned boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (storage_path is not null or url is not null or external_id is not null)
);
create trigger documents_updated before update on documents for each row execute function set_updated_at();
create index documents_project_idx on documents(project_id, category);

-- A project linked to a Screenplay Studio project or a Graphite workspace/page.
-- The portal reads from those apps server-side with the viewer's own token
-- (see user_connections), so it never shows more than the person could see there.
create table project_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  provider text not null check (provider in ('screenplay_studio', 'graphite', 'cinderra', 'castingcall', 'github', 'other')),
  external_id text not null,
  external_url text,
  label text,
  min_role project_role not null default 'crew',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (project_id, provider, external_id)
);

-- Per-user tokens for SPS / Graphite. Server-only: RLS on, no policies, and
-- the token is encrypted by the app (AES-GCM, key in env) before it lands here.
create table user_connections (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('screenplay_studio', 'graphite')),
  token_ciphertext text not null,
  external_user_label text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  primary key (user_id, provider)
);
