-- Creating a project or a chat channel failed with "violates row-level security".
-- The app inserts and reads the new row back in one statement, and Postgres checks
-- the read policy then. The helper functions look the row up by id, and they can't
-- see a row the same statement is still inserting, so the read check said no.
-- These policies now also pass on the row's own columns: the creator can always
-- read what they just made, and so can org admins.

drop policy if exists projects_read on projects;
create policy projects_read on projects for select
  using ((visibility in ('public', 'unlisted') and published_at is not null and published_at <= now())
         or created_by = auth.uid()
         or org_role_at_least(org_id, 'admin')
         or has_perm(org_id, 'projects.manage_all')
         or can_view_project(id));

drop policy if exists channels_read on chat_channels;
create policy channels_read on chat_channels for select
  using (created_by = auth.uid() or can_read_channel(id));
