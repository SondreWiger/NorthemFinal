-- Access control: helper functions, guard triggers, row-level security, and
-- the few server-side RPCs (accept an invite, open a DM).
--
-- The rules in one paragraph:
--   * Org role (guest < press < cast < crew < producer < admin < owner) decides
--     what someone sees across the org. Admins and owners act as project lead
--     everywhere; so does anyone with the projects.manage_all permission.
--   * Project role (guest < cast < crew < head < lead) decides what someone
--     sees inside a project. Documents and links carry a min_role and optional
--     departments, so a cast member gets sides and call sheets, not budgets.
--   * Public pages read only rows that are is_public on projects that are
--     published as public/unlisted. The anon key sees nothing else.
--   * Forms, invites and integration tokens are written only by the server
--     (service role), which validates, rate-limits and sends mail via Resend.
--
-- Helpers are SECURITY DEFINER so policies can call them without recursing
-- through RLS on the tables they read.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function my_org_role(p_org uuid) returns org_role
language sql stable security definer set search_path = public as $$
  select role from org_members
  where org_id = p_org and user_id = auth.uid() and status = 'active';
$$;

create or replace function org_role_at_least(p_org uuid, p_role org_role) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(my_org_role(p_org) >= p_role, false);
$$;

create or replace function has_perm(p_org uuid, p_perm text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when my_org_role(p_org) is null then false
    when my_org_role(p_org) = 'owner' then true
    else exists (select 1 from role_permissions
                 where org_id = p_org and role = my_org_role(p_org) and perm = p_perm)
  end;
$$;

-- True when the two users share an active org (used for profile visibility).
create or replace function shares_org(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from org_members a join org_members b on a.org_id = b.org_id
    where a.user_id = auth.uid() and b.user_id = p_user
      and a.status = 'active' and b.status = 'active');
$$;

create or replace function project_org(p_project uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select org_id from projects where id = p_project;
$$;

-- Effective project role: org admins / manage_all act as lead.
create or replace function my_project_role(p_project uuid) returns project_role
language sql stable security definer set search_path = public as $$
  select case
    when org_role_at_least(project_org(p_project), 'admin')
      or has_perm(project_org(p_project), 'projects.manage_all') then 'lead'::project_role
    else (select pm.role from project_members pm
          join org_members om on om.org_id = project_org(p_project) and om.user_id = pm.user_id
          where pm.project_id = p_project and pm.user_id = auth.uid() and om.status = 'active')
  end;
$$;

create or replace function project_role_at_least(p_project uuid, p_role project_role) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(my_project_role(p_project) >= p_role, false);
$$;

create or replace function my_project_departments(p_project uuid) returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce((select departments from project_members
                   where project_id = p_project and user_id = auth.uid()), '{}');
$$;

-- Public page is live.
create or replace function project_is_public(p_project uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from projects
    where id = p_project and visibility in ('public', 'unlisted')
      and published_at is not null and published_at <= now());
$$;

-- Can see the project inside portal: members, or crew+ for non-private projects.
create or replace function can_view_project(p_project uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select my_project_role(p_project) is not null
      or exists (select 1 from projects p where p.id = p_project
                 and p.visibility <> 'private' and org_role_at_least(p.org_id, 'crew'));
$$;

-- Role + department gate for documents and links. Leads skip department checks.
create or replace function can_read_gated(p_project uuid, p_min project_role, p_depts text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select project_role_at_least(p_project, p_min)
     and (cardinality(p_depts) = 0
          or project_role_at_least(p_project, 'lead')
          or my_project_departments(p_project) && p_depts);
$$;

create or replace function can_read_channel(p_channel uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from chat_channels c where c.id = p_channel and (
      exists (select 1 from chat_members m where m.channel_id = c.id and m.user_id = auth.uid()
              and org_role_at_least(c.org_id, 'guest'))
      or (not c.is_private and c.kind = 'channel' and org_role_at_least(c.org_id, c.min_org_role))
      or (not c.is_private and c.kind = 'project' and project_role_at_least(c.project_id, c.min_project_role))
    ));
$$;

create or replace function can_moderate_channel(p_channel uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from chat_channels c where c.id = p_channel and (
      (c.kind in ('channel', 'project') and has_perm(c.org_id, 'chat.moderate'))
      or (c.kind = 'project' and project_role_at_least(c.project_id, 'lead'))
      or exists (select 1 from chat_members m where m.channel_id = c.id
                 and m.user_id = auth.uid() and m.is_admin)
    ));
$$;

-- ---------------------------------------------------------------------------
-- Guard triggers (things a policy can't express: who may grant what)
-- auth.uid() is null for the service role and SQL editor, which skip guards.
-- ---------------------------------------------------------------------------

create or replace function org_members_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  actor org_role;
  owners int;
begin
  if auth.uid() is null then return coalesce(new, old); end if;
  actor := my_org_role(coalesce(new.org_id, old.org_id));

  -- Leaving: anyone may remove themselves, except the last owner.
  if tg_op = 'DELETE' and old.user_id = auth.uid() and old.role <> 'owner' then return old; end if;

  -- Accepting an invite: you may add yourself up to the invited role.
  if tg_op in ('INSERT', 'UPDATE') and new.user_id = auth.uid() and exists (
       select 1 from invites i
       where i.org_id = new.org_id and lower(i.email::text) = lower(coalesce(auth.jwt()->>'email', ''))
         and i.accepted_at is null and i.revoked_at is null and i.expires_at > now()
         and (i.org_role >= new.role or (tg_op = 'UPDATE' and new.role = old.role))) then
    return new;
  end if;

  if actor is null then raise exception 'not a member of this org'; end if;
  if actor <> 'owner' then
    -- Non-owners can only touch people below them and grant roles below their own.
    if tg_op in ('UPDATE', 'DELETE') and old.role >= actor then
      raise exception 'you cannot change someone at or above your own role';
    end if;
    if tg_op in ('INSERT', 'UPDATE') and new.role >= actor then
      raise exception 'you cannot grant a role at or above your own';
    end if;
  end if;

  if tg_op in ('UPDATE', 'DELETE') and old.role = 'owner'
     and (tg_op = 'DELETE' or new.role <> 'owner' or new.status <> 'active') then
    select count(*) into owners from org_members
      where org_id = old.org_id and role = 'owner' and status = 'active';
    if owners <= 1 then raise exception 'an org needs at least one owner'; end if;
  end if;
  if tg_op = 'UPDATE' and (new.org_id <> old.org_id or new.user_id <> old.user_id) then
    raise exception 'membership cannot be moved';
  end if;
  return coalesce(new, old);
end $$;
create trigger org_members_guard before insert or update or delete on org_members
  for each row execute function org_members_guard();

create or replace function project_members_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return coalesce(new, old); end if;
  if tg_op = 'DELETE' and old.user_id = auth.uid() then return old; end if;  -- leave
  if tg_op in ('INSERT', 'UPDATE') then
    -- Project members must already belong to the org (invites handle newcomers).
    if not exists (select 1 from org_members where org_id = project_org(new.project_id)
                   and user_id = new.user_id and status = 'active') then
      raise exception 'add this person to the org first, or send them an invite';
    end if;
    if tg_op = 'UPDATE' and (new.project_id <> old.project_id or new.user_id <> old.user_id) then
      raise exception 'membership cannot be moved';
    end if;
  end if;
  return coalesce(new, old);
end $$;
create trigger project_members_guard before insert or update or delete on project_members
  for each row execute function project_members_guard();

-- A linked person may edit their own public bio, photo and links, but not
-- which account or org the person belongs to.
create or replace function people_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or has_perm(old.org_id, 'people.manage') then return new; end if;
  if new.org_id <> old.org_id or new.profile_id is distinct from old.profile_id or new.slug <> old.slug then
    raise exception 'only people managers can relink or rename a person';
  end if;
  return new;
end $$;
create trigger people_guard before update on people for each row execute function people_guard();

-- Chat authors may edit body/attachments or soft-delete; nothing else moves.
create or replace function chat_messages_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if new.channel_id <> old.channel_id or new.author_id is distinct from old.author_id
     or new.created_at <> old.created_at or new.thread_root_id is distinct from old.thread_root_id then
    raise exception 'message cannot be moved';
  end if;
  if new.reply_count <> old.reply_count then new.reply_count := old.reply_count; end if;
  if old.author_id is distinct from auth.uid() then
    -- moderators may only soft-delete
    if new.body <> old.body or new.attachments <> old.attachments then
      raise exception 'only the author can edit a message';
    end if;
  elsif new.body <> old.body then
    new.edited_at := now();
  end if;
  return new;
end $$;
create trigger chat_messages_guard before update on chat_messages
  for each row execute function chat_messages_guard();

-- New project: creator becomes lead, and the project gets its crew channel.
create or replace function projects_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.created_by is not null then
    insert into project_members (project_id, user_id, role, added_by)
    values (new.id, new.created_by, 'lead', new.created_by) on conflict do nothing;
  end if;
  insert into chat_channels (org_id, project_id, kind, name, created_by, min_project_role)
  values (new.org_id, new.id, 'project', new.title, new.created_by, 'cast');
  return new;
end $$;
create trigger projects_after_insert after insert on projects
  for each row execute function projects_after_insert();

create or replace function projects_before_insert() returns trigger
language plpgsql as $$
begin
  if auth.uid() is not null then new.created_by := auth.uid(); end if;
  return new;
end $$;
create trigger projects_before_insert before insert on projects
  for each row execute function projects_before_insert();

-- Tell people when they get a credit or a project role.
create or replace function notify_credit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  uid uuid; ptitle text; porg uuid;
begin
  select profile_id into uid from people where id = new.person_id;
  if uid is null then return new; end if;
  select title, org_id into ptitle, porg from projects where id = new.project_id;
  insert into notifications (user_id, org_id, kind, title, body, data)
  values (uid, porg, 'credit_added', 'You were credited on ' || ptitle, new.job,
          jsonb_build_object('project_id', new.project_id, 'credit_id', new.id));
  return new;
end $$;
create trigger credits_notify after insert on credits for each row execute function notify_credit();

create or replace function notify_project_member() returns trigger
language plpgsql security definer set search_path = public as $$
declare ptitle text; porg uuid;
begin
  if new.user_id = new.added_by then return new; end if;
  select title, org_id into ptitle, porg from projects where id = new.project_id;
  insert into notifications (user_id, org_id, kind, title, data)
  values (new.user_id, porg, 'added_to_project', 'You were added to ' || ptitle,
          jsonb_build_object('project_id', new.project_id, 'role', new.role));
  return new;
end $$;
create trigger project_members_notify after insert on project_members
  for each row execute function notify_project_member();

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- What the invite page shows before sign-up. Reveals nothing without the token.
create or replace function invite_preview(p_token text) returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  select jsonb_build_object(
    'org', o.name, 'org_slug', o.slug, 'branding', o.branding,
    'project', p.title, 'project_role', i.project_role, 'org_role', i.org_role,
    'title', i.title, 'message', i.message,
    'invited_by', pr.display_name, 'email', i.email,
    'person', pe.name, 'expires_at', i.expires_at)
  from invites i
  join orgs o on o.id = i.org_id
  left join projects p on p.id = i.project_id
  left join profiles pr on pr.id = i.invited_by
  left join people pe on pe.id = i.person_id
  where i.token_hash = encode(digest(p_token, 'sha256'), 'hex')
    and i.accepted_at is null and i.revoked_at is null and i.expires_at > now();
$$;

-- Signed-in user redeems an invite sent to their email address.
create or replace function accept_invite(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  inv invites;
  my_email text := lower(coalesce(auth.jwt()->>'email', ''));
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select * into inv from invites
    where token_hash = encode(digest(p_token, 'sha256'), 'hex') for update;
  if not found or inv.revoked_at is not null then raise exception 'invite not found'; end if;
  if inv.accepted_at is not null then raise exception 'invite already used'; end if;
  if inv.expires_at <= now() then raise exception 'invite expired'; end if;
  if lower(inv.email::text) <> my_email then
    raise exception 'this invite was sent to a different email address';
  end if;

  -- Org membership: keep the higher of existing and invited role.
  insert into org_members (org_id, user_id, role, title, departments)
  values (inv.org_id, auth.uid(), inv.org_role, inv.title, inv.departments)
  on conflict (org_id, user_id) do update
    set role = greatest(org_members.role, excluded.role), status = 'active';

  if inv.project_id is not null then
    insert into project_members (project_id, user_id, role, departments, title, added_by)
    values (inv.project_id, auth.uid(), inv.project_role, inv.departments, inv.title, inv.invited_by)
    on conflict (project_id, user_id) do update
      set role = greatest(project_members.role, excluded.role);
  end if;

  -- Claim the credited person, or create one for them.
  if inv.person_id is not null then
    update people set profile_id = auth.uid()
      where id = inv.person_id and profile_id is null
        and not exists (select 1 from people where org_id = inv.org_id and profile_id = auth.uid());
  end if;

  update invites set accepted_at = now(), accepted_by = auth.uid() where id = inv.id;
  insert into audit_log (org_id, actor_id, action, target_table, target_id)
  values (inv.org_id, auth.uid(), 'invite.accepted', 'invites', inv.id::text);

  return jsonb_build_object('org_id', inv.org_id, 'project_id', inv.project_id);
end $$;

-- Find or create the DM channel between me and another member.
create or replace function open_dm(p_org uuid, p_other uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  a uuid := least(auth.uid(), p_other);
  b uuid := greatest(auth.uid(), p_other);
  ch uuid;
begin
  if auth.uid() is null or p_other = auth.uid() then raise exception 'invalid DM'; end if;
  if not org_role_at_least(p_org, 'cast') then raise exception 'not allowed to start DMs'; end if;
  if not exists (select 1 from org_members where org_id = p_org and user_id = p_other and status = 'active') then
    raise exception 'that person is not in this org';
  end if;
  select channel_id into ch from chat_dm_pairs where org_id = p_org and user_a = a and user_b = b;
  if ch is not null then return ch; end if;
  insert into chat_channels (org_id, kind, is_private, created_by)
    values (p_org, 'dm', true, auth.uid()) returning id into ch;
  insert into chat_members (channel_id, user_id) values (ch, a), (ch, b);
  insert into chat_dm_pairs values (p_org, a, b, ch);
  return ch;
end $$;

revoke execute on function accept_invite(text) from anon;
revoke execute on function open_dm(uuid, uuid) from anon;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table orgs enable row level security;
alter table org_domains enable row level security;
alter table divisions enable row level security;
alter table profiles enable row level security;
alter table org_members enable row level security;
alter table role_permissions enable row level security;
alter table people enable row level security;
alter table themes enable row level security;
alter table projects enable row level security;
alter table project_members enable row level security;
alter table credits enable row level security;
alter table media enable row level security;
alter table media_people enable row level security;
alter table trivia enable row level security;
alter table moments enable row level security;
alter table podcast_episodes enable row level security;
alter table podcast_guests enable row level security;
alter table documents enable row level security;
alter table project_links enable row level security;
alter table user_connections enable row level security;   -- server only, no policies
alter table openings enable row level security;
alter table submissions enable row level security;
alter table submission_notes enable row level security;
alter table invites enable row level security;
alter table press_kits enable row level security;
alter table press_kit_items enable row level security;
alter table notifications enable row level security;
alter table devices enable row level security;
alter table audit_log enable row level security;
alter table chat_channels enable row level security;
alter table chat_members enable row level security;
alter table chat_messages enable row level security;
alter table chat_reactions enable row level security;
alter table chat_dm_pairs enable row level security;

-- Orgs, domains, divisions: public metadata the sites need to render.
create policy orgs_read on orgs for select using (true);
create policy orgs_update on orgs for update using (org_role_at_least(id, 'admin')) with check (org_role_at_least(id, 'admin'));

create policy domains_read on org_domains for select using (true);
create policy domains_write on org_domains for all using (org_role_at_least(org_id, 'owner')) with check (org_role_at_least(org_id, 'owner'));

create policy divisions_read on divisions for select using (is_public or org_role_at_least(org_id, 'guest'));
create policy divisions_write on divisions for all using (has_perm(org_id, 'sites.edit')) with check (has_perm(org_id, 'sites.edit'));

-- Profiles: public ones to everyone, the rest to colleagues; only you edit yours.
create policy profiles_read on profiles for select using (is_public or id = auth.uid() or shares_org(id));
create policy profiles_insert on profiles for insert with check (id = auth.uid());
create policy profiles_update on profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Members: cast and up see the team list; guests and press see only themselves.
create policy members_read on org_members for select
  using (user_id = auth.uid() or org_role_at_least(org_id, 'cast'));
create policy members_insert on org_members for insert with check (has_perm(org_id, 'people.manage'));
create policy members_update on org_members for update
  using (has_perm(org_id, 'people.manage')) with check (has_perm(org_id, 'people.manage'));
create policy members_delete on org_members for delete
  using (user_id = auth.uid() or has_perm(org_id, 'people.manage'));

create policy perms_read on role_permissions for select using (org_role_at_least(org_id, 'guest'));
create policy perms_write on role_permissions for all
  using (org_role_at_least(org_id, 'owner')) with check (org_role_at_least(org_id, 'owner'));

-- People (credit-able): public ones to all; managers and project leads create.
create policy people_read on people for select using (is_public or org_role_at_least(org_id, 'cast'));
create policy people_insert on people for insert
  with check (has_perm(org_id, 'people.manage') or has_perm(org_id, 'projects.create'));
create policy people_update on people for update
  using (has_perm(org_id, 'people.manage') or profile_id = auth.uid())
  with check (has_perm(org_id, 'people.manage') or profile_id = auth.uid());
create policy people_delete on people for delete using (has_perm(org_id, 'people.manage'));

create policy themes_read on themes for select using (true);
create policy themes_write on themes for all using (has_perm(org_id, 'sites.edit')) with check (has_perm(org_id, 'sites.edit'));

-- Projects
create policy projects_read on projects for select
  using ((visibility in ('public', 'unlisted') and published_at is not null and published_at <= now())
         or can_view_project(id));
create policy projects_insert on projects for insert with check (has_perm(org_id, 'projects.create'));
create policy projects_update on projects for update
  using (project_role_at_least(id, 'lead')) with check (project_role_at_least(id, 'lead'));
create policy projects_delete on projects for delete
  using (has_perm(org_id, 'projects.manage_all') or org_role_at_least(org_id, 'admin'));

create policy pmembers_read on project_members for select
  using (user_id = auth.uid() or can_view_project(project_id));
create policy pmembers_insert on project_members for insert with check (project_role_at_least(project_id, 'lead'));
create policy pmembers_update on project_members for update
  using (project_role_at_least(project_id, 'lead')) with check (project_role_at_least(project_id, 'lead'));
create policy pmembers_delete on project_members for delete
  using (user_id = auth.uid() or project_role_at_least(project_id, 'lead'));

-- Credits
create policy credits_read on credits for select
  using ((is_public and project_is_public(project_id)) or can_view_project(project_id));
create policy credits_write on credits for all
  using (project_role_at_least(project_id, 'lead') or has_perm(project_org(project_id), 'people.manage'))
  with check (project_role_at_least(project_id, 'lead') or has_perm(project_org(project_id), 'people.manage'));

-- Media / trivia / moments: crew contribute, heads and leads publish.
create policy media_read on media for select
  using ((is_public and project_is_public(project_id)) or project_role_at_least(project_id, 'cast'));
create policy media_insert on media for insert
  with check (project_role_at_least(project_id, 'crew') and uploaded_by = auth.uid()
              and (not is_public or project_role_at_least(project_id, 'head')));
create policy media_update on media for update
  using ((uploaded_by = auth.uid() and project_role_at_least(project_id, 'crew')) or project_role_at_least(project_id, 'head'))
  with check (not is_public or project_role_at_least(project_id, 'head'));
create policy media_delete on media for delete
  using ((uploaded_by = auth.uid() and project_role_at_least(project_id, 'crew')) or project_role_at_least(project_id, 'head'));

create policy media_people_read on media_people for select
  using (exists (select 1 from media m where m.id = media_id));   -- inherits media_read
create policy media_people_write on media_people for all
  using (exists (select 1 from media m where m.id = media_id and project_role_at_least(m.project_id, 'crew')))
  with check (exists (select 1 from media m where m.id = media_id and project_role_at_least(m.project_id, 'crew')));

create policy trivia_read on trivia for select
  using ((is_public and project_is_public(project_id)) or project_role_at_least(project_id, 'cast'));
create policy trivia_insert on trivia for insert
  with check (project_role_at_least(project_id, 'cast') and created_by = auth.uid()
              and (not is_public or project_role_at_least(project_id, 'head')));
create policy trivia_update on trivia for update
  using ((created_by = auth.uid() and project_role_at_least(project_id, 'cast')) or project_role_at_least(project_id, 'head'))
  with check (not is_public or project_role_at_least(project_id, 'head'));
create policy trivia_delete on trivia for delete
  using ((created_by = auth.uid() and project_role_at_least(project_id, 'cast')) or project_role_at_least(project_id, 'head'));

create policy moments_read on moments for select
  using ((is_public and project_is_public(project_id)) or project_role_at_least(project_id, 'cast'));
create policy moments_insert on moments for insert
  with check (project_role_at_least(project_id, 'crew') and created_by = auth.uid()
              and (not is_public or project_role_at_least(project_id, 'head')));
create policy moments_update on moments for update
  using ((created_by = auth.uid() and project_role_at_least(project_id, 'crew')) or project_role_at_least(project_id, 'head'))
  with check (not is_public or project_role_at_least(project_id, 'head'));
create policy moments_delete on moments for delete
  using ((created_by = auth.uid() and project_role_at_least(project_id, 'crew')) or project_role_at_least(project_id, 'head'));

-- Podcasts
create policy podcasts_read on podcast_episodes for select
  using ((is_public and published_at is not null and published_at <= now()
          and (project_id is null or project_is_public(project_id)))
         or (project_id is null and org_role_at_least(org_id, 'cast'))
         or (project_id is not null and project_role_at_least(project_id, 'cast')));
create policy podcasts_write on podcast_episodes for all
  using (has_perm(org_id, 'podcasts.publish') or (project_id is not null and project_role_at_least(project_id, 'lead')))
  with check (has_perm(org_id, 'podcasts.publish') or (project_id is not null and project_role_at_least(project_id, 'lead')));

create policy guests_read on podcast_guests for select
  using (exists (select 1 from podcast_episodes e where e.id = episode_id));
create policy guests_write on podcast_guests for all
  using (exists (select 1 from podcast_episodes e where e.id = episode_id
                 and (has_perm(e.org_id, 'podcasts.publish') or (e.project_id is not null and project_role_at_least(e.project_id, 'lead')))))
  with check (exists (select 1 from podcast_episodes e where e.id = episode_id
                 and (has_perm(e.org_id, 'podcasts.publish') or (e.project_id is not null and project_role_at_least(e.project_id, 'lead')))));

-- Documents and links: role + department gated.
create policy documents_read on documents for select using (can_read_gated(project_id, min_role, departments));
create policy documents_insert on documents for insert
  with check (project_role_at_least(project_id, 'head') and created_by = auth.uid()
              and can_read_gated(project_id, min_role, departments));
create policy documents_update on documents for update
  using ((created_by = auth.uid() and project_role_at_least(project_id, 'head')) or project_role_at_least(project_id, 'lead'))
  with check (project_role_at_least(project_id, 'head') and can_read_gated(project_id, min_role, departments));
create policy documents_delete on documents for delete
  using ((created_by = auth.uid() and project_role_at_least(project_id, 'head')) or project_role_at_least(project_id, 'lead'));

create policy links_read on project_links for select using (project_role_at_least(project_id, min_role));
create policy links_write on project_links for all
  using (project_role_at_least(project_id, 'lead')) with check (project_role_at_least(project_id, 'lead'));

-- Openings
create policy openings_read on openings for select
  using ((is_public and is_open) or org_role_at_least(org_id, 'crew'));
create policy openings_write on openings for all
  using (has_perm(org_id, 'openings.manage')) with check (has_perm(org_id, 'openings.manage'));

-- Inbox (no insert policy: the server inserts after validation).
create policy submissions_read on submissions for select
  using (has_perm(org_id, 'forms.read') or assigned_to = auth.uid());
create policy submissions_update on submissions for update
  using (has_perm(org_id, 'forms.manage') or assigned_to = auth.uid())
  with check (has_perm(org_id, 'forms.manage') or assigned_to = auth.uid());
create policy submissions_delete on submissions for delete using (has_perm(org_id, 'forms.manage'));

create policy snotes_read on submission_notes for select
  using (exists (select 1 from submissions s where s.id = submission_id));
create policy snotes_insert on submission_notes for insert
  with check (author_id = auth.uid() and exists (select 1 from submissions s where s.id = submission_id));

-- Invites: visible to inviters (token is only a hash); created by the server.
create policy invites_read on invites for select using (has_perm(org_id, 'people.invite'));
create policy invites_revoke on invites for update
  using (has_perm(org_id, 'people.invite')) with check (has_perm(org_id, 'people.invite'));

-- Press kits
create policy kits_read on press_kits for select
  using ((audience = 'public' and (embargo_until is null or embargo_until <= now()))
         or org_role_at_least(org_id, 'press'));
create policy kits_write on press_kits for all
  using (has_perm(org_id, 'sites.edit') or (project_id is not null and project_role_at_least(project_id, 'lead')))
  with check (has_perm(org_id, 'sites.edit') or (project_id is not null and project_role_at_least(project_id, 'lead')));
create policy kit_items_read on press_kit_items for select
  using (exists (select 1 from press_kits k where k.id = kit_id));
create policy kit_items_write on press_kit_items for all
  using (exists (select 1 from press_kits k where k.id = kit_id
                 and (has_perm(k.org_id, 'sites.edit') or (k.project_id is not null and project_role_at_least(k.project_id, 'lead')))))
  with check (exists (select 1 from press_kits k where k.id = kit_id
                 and (has_perm(k.org_id, 'sites.edit') or (k.project_id is not null and project_role_at_least(k.project_id, 'lead')))));

-- Personal rows
create policy notif_own on notifications for select using (user_id = auth.uid());
create policy notif_mark on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notif_delete on notifications for delete using (user_id = auth.uid());
create policy devices_own on devices for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy audit_read on audit_log for select using (has_perm(org_id, 'audit.read'));

-- Chat
create policy channels_read on chat_channels for select using (can_read_channel(id));
create policy channels_insert on chat_channels for insert
  with check (created_by = auth.uid() and (
       (kind = 'channel' and has_perm(org_id, 'chat.create_channel'))
    or (kind = 'project' and project_role_at_least(project_id, 'head') and project_org(project_id) = org_id)
    or (kind = 'group' and org_role_at_least(org_id, 'cast'))));
create policy channels_update on chat_channels for update
  using (can_moderate_channel(id)) with check (can_moderate_channel(id));
create policy channels_delete on chat_channels for delete
  using (kind <> 'dm' and can_moderate_channel(id));

create policy cmembers_read on chat_members for select using (can_read_channel(channel_id));
-- Join an open channel yourself, or be added by a channel admin/moderator (or
-- the creator of a new group adding the first members).
create policy cmembers_insert on chat_members for insert
  with check (
    (user_id = auth.uid() and can_read_channel(channel_id))
    or (can_moderate_channel(channel_id)
        and exists (select 1 from chat_channels c join org_members m on m.org_id = c.org_id
                    where c.id = channel_id and c.kind <> 'dm' and m.user_id = chat_members.user_id and m.status = 'active'))
    or exists (select 1 from chat_channels c join org_members m on m.org_id = c.org_id
               where c.id = channel_id and c.kind = 'group' and c.created_by = auth.uid()
                 and m.user_id = chat_members.user_id and m.status = 'active'));
create policy cmembers_update on chat_members for update
  using (user_id = auth.uid() or can_moderate_channel(channel_id))
  with check (user_id = auth.uid() or can_moderate_channel(channel_id));
create policy cmembers_delete on chat_members for delete
  using (user_id = auth.uid() or can_moderate_channel(channel_id));

create policy messages_read on chat_messages for select using (can_read_channel(channel_id));
create policy messages_insert on chat_messages for insert
  with check (author_id = auth.uid() and can_read_channel(channel_id)
              and exists (select 1 from chat_channels c where c.id = channel_id and c.archived_at is null)
              and (thread_root_id is null or exists (select 1 from chat_messages r
                   where r.id = thread_root_id and r.channel_id = chat_messages.channel_id)));
create policy messages_update on chat_messages for update
  using (author_id = auth.uid() or can_moderate_channel(channel_id))
  with check (can_read_channel(channel_id));
create policy messages_delete on chat_messages for delete using (can_moderate_channel(channel_id));

create policy reactions_read on chat_reactions for select
  using (exists (select 1 from chat_messages m where m.id = message_id));
create policy reactions_insert on chat_reactions for insert
  with check (user_id = auth.uid() and exists (select 1 from chat_messages m where m.id = message_id));
create policy reactions_delete on chat_reactions for delete using (user_id = auth.uid());

create policy dm_pairs_read on chat_dm_pairs for select using (auth.uid() in (user_a, user_b));

-- Realtime
alter publication supabase_realtime add table chat_messages, chat_reactions, chat_members, chat_channels, notifications;
