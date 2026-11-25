-- Server-only helpers used by the apps with the service role.

-- Look up an account by email when adding someone to a project, so we know
-- whether to add them directly or send an invite. Never callable by users.
create or replace function user_id_by_email(p_email text) returns uuid
language sql stable security definer set search_path = public, auth as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;
revoke execute on function user_id_by_email(text) from public, anon, authenticated;
grant execute on function user_id_by_email(text) to service_role;

-- Effective project role for the current user, for UI decisions.
create or replace function my_project_role_rpc(p_project uuid) returns project_role
language sql stable security definer set search_path = public as $$
  select my_project_role(p_project);
$$;

-- Unread count per channel for the signed-in user (chat sidebar).
create or replace function chat_unread() returns table (channel_id uuid, unread bigint)
language sql stable security definer set search_path = public as $$
  select m.channel_id, count(msg.id)
  from chat_members m
  join chat_messages msg on msg.channel_id = m.channel_id
   and msg.created_at > m.last_read_at and msg.author_id is distinct from m.user_id and msg.deleted_at is null
  where m.user_id = auth.uid()
  group by m.channel_id;
$$;
