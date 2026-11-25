-- Everything that comes in from the public sites (contact, pitches,
-- applications, casting), the invites that bring people onto the platform,
-- press kits, notifications and the audit log.

-- ---------------------------------------------------------------------------
-- Openings: jobs, casting calls, collaborations. Shown on the division sites.
-- ---------------------------------------------------------------------------

create table openings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  division_id uuid references divisions(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  kind text not null check (kind in ('job', 'crew', 'casting', 'collab', 'internship')),
  title text not null,
  body text,
  location text,
  closes_at timestamptz,
  questions jsonb not null default '[]'::jsonb,   -- extra form fields [{id, label, type, required}]
  is_open boolean not null default true,
  is_public boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger openings_updated before update on openings for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Submissions: every public form lands here (contact, pitch, application,
-- casting, collab, press request, newsletter). The admin inbox reads this.
-- Inserted only by server actions (service role) after validation, rate
-- limiting and a bot check, so the anon key never touches it.
-- ---------------------------------------------------------------------------

create type submission_status as enum ('new', 'reviewing', 'shortlisted', 'replied', 'accepted', 'declined', 'spam', 'archived');

create table submissions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  division_id uuid references divisions(id) on delete set null,
  opening_id uuid references openings(id) on delete set null,
  form text not null check (form in ('contact', 'pitch', 'application', 'casting', 'collab', 'press', 'newsletter', 'client')),
  name text,
  email citext not null,
  phone text,
  subject text,
  message text,
  payload jsonb not null default '{}'::jsonb,   -- answers, links, budget range, etc.
  attachments text[] not null default '{}',     -- paths in the 'submissions' bucket
  source_host text,                              -- which site it came from
  user_id uuid references auth.users(id) on delete set null,  -- if signed in
  status submission_status not null default 'new',
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger submissions_updated before update on submissions for each row execute function set_updated_at();
create index submissions_inbox_idx on submissions(org_id, status, created_at desc);

create table submission_notes (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Invites. Adding someone by email to the org or a project:
--   * email belongs to an existing user -> the server adds them directly and
--     sends a "you've been added" mail (no invite row needed).
--   * otherwise -> an invite row plus a Resend mail with a one-time link to
--     portal/invite/<token>, where they sign up, build their profile, and
--     accept_invite() wires up membership, project role and their person/credits.
-- Only the SHA-256 of the token is stored.
-- ---------------------------------------------------------------------------

create table invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  email citext not null,
  token_hash text not null unique,
  org_role org_role not null default 'guest',
  project_id uuid references projects(id) on delete cascade,
  project_role project_role,
  departments text[] not null default '{}',
  title text,
  person_id uuid references people(id) on delete set null,   -- the credited person they'll become
  message text,
  invited_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check ((project_id is null) = (project_role is null))
);
create index invites_email_idx on invites(org_id, email) where accepted_at is null and revoked_at is null;

-- ---------------------------------------------------------------------------
-- Press kits: per project or org-wide. 'press' audience needs the Press role
-- (or higher); 'public' is downloadable from the site.
-- ---------------------------------------------------------------------------

create table press_kits (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  summary text,
  audience text not null default 'press' check (audience in ('press', 'public')),
  embargo_until timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger press_kits_updated before update on press_kits for each row execute function set_updated_at();

create table press_kit_items (
  id uuid primary key default gen_random_uuid(),
  kit_id uuid not null references press_kits(id) on delete cascade,
  title text not null,
  kind text not null default 'file' check (kind in ('file', 'image', 'video', 'text', 'link')),
  storage_path text,       -- in the 'press' bucket
  url text,
  body text,
  sort int not null default 0
);

-- ---------------------------------------------------------------------------
-- Notifications (in-app + push) and devices for the future mobile app
-- ---------------------------------------------------------------------------

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references orgs(id) on delete cascade,
  kind text not null,              -- added_to_project, credit_added, mention, submission, ...
  title text not null,
  body text,
  href text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications(user_id, created_at desc);

create table devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android', 'web')),
  push_token text not null,
  app_version text,
  last_seen_at timestamptz not null default now(),
  unique (platform, push_token)
);

-- ---------------------------------------------------------------------------
-- Audit log: admin actions. Written by the server and by triggers.
-- ---------------------------------------------------------------------------

create table audit_log (
  id bigint generated always as identity primary key,
  org_id uuid references orgs(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_table text,
  target_id text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_org_idx on audit_log(org_id, created_at desc);
