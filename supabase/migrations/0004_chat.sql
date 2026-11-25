-- Chat: org channels, project channels, group chats and DMs, with threads,
-- reactions and read markers. Realtime via Supabase Realtime (postgres_changes
-- on chat_messages, filtered by channel_id; RLS applies to realtime too).

create table chat_channels (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  kind text not null check (kind in ('channel', 'project', 'group', 'dm')),
  name text,
  topic text,
  -- Open channels: anyone at or above min role may join/read.
  -- Private channels, groups and DMs: chat_members only.
  is_private boolean not null default false,
  min_org_role org_role not null default 'crew',
  min_project_role project_role not null default 'cast',
  archived_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  check (kind <> 'project' or project_id is not null),
  check (kind not in ('group', 'dm') or is_private)
);
create index chat_channels_org_idx on chat_channels(org_id, kind);
create index chat_channels_project_idx on chat_channels(project_id);

create table chat_members (
  channel_id uuid not null references chat_channels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_admin boolean not null default false,
  muted boolean not null default false,
  last_read_at timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);
create index chat_members_user_idx on chat_members(user_id);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references chat_channels(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  body text not null default '',
  attachments jsonb not null default '[]'::jsonb,   -- [{path, name, mime, size}] in 'chat' bucket
  thread_root_id uuid references chat_messages(id) on delete cascade,
  reply_count int not null default 0,
  mentions uuid[] not null default '{}',
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  check (length(body) <= 20000)
);
create index chat_messages_channel_idx on chat_messages(channel_id, created_at desc);
create index chat_messages_thread_idx on chat_messages(thread_root_id, created_at) where thread_root_id is not null;

create table chat_reactions (
  message_id uuid not null references chat_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (length(emoji) <= 32),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

-- Keep last_message_at and reply_count current.
create or replace function chat_after_message() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update chat_channels set last_message_at = new.created_at where id = new.channel_id;
  if new.thread_root_id is not null then
    update chat_messages set reply_count = reply_count + 1 where id = new.thread_root_id;
  end if;
  return new;
end $$;
create trigger chat_messages_after_insert after insert on chat_messages
  for each row execute function chat_after_message();

-- One DM channel per pair, created or found atomically.
create table chat_dm_pairs (
  org_id uuid not null references orgs(id) on delete cascade,
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  channel_id uuid not null references chat_channels(id) on delete cascade,
  primary key (org_id, user_a, user_b),
  check (user_a < user_b)
);
