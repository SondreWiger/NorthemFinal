-- Storage buckets. Paths start with the id that decides access:
--   public-media  <project_id>/...   public read; crew+ upload (rows decide what the site shows)
--   avatars       <user_id>/...      public read; you write your own folder
--   project-files <project_id>/...   private; readable when a documents row for the path is readable
--   press         <kit_id>/...       private unless the kit is public
--   chat          <channel_id>/...   private; channel readers
--   submissions   <submission_id>/... private; server uploads, forms.read downloads

insert into storage.buckets (id, name, public) values
  ('public-media', 'public-media', true),
  ('avatars', 'avatars', true),
  ('project-files', 'project-files', false),
  ('press', 'press', false),
  ('chat', 'chat', false),
  ('submissions', 'submissions', false)
on conflict (id) do nothing;

create or replace function public.storage_first_uuid(p_name text) returns uuid
language plpgsql immutable as $$
begin
  return split_part(p_name, '/', 1)::uuid;
exception when others then
  return null;
end $$;

create policy "public media upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'public-media' and public.project_role_at_least(storage_first_uuid(name), 'crew'));
create policy "public media manage" on storage.objects for delete to authenticated
  using (bucket_id = 'public-media' and public.project_role_at_least(storage_first_uuid(name), 'head'));

create policy "avatar write" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and public.storage_first_uuid(name) = auth.uid());
create policy "avatar update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and public.storage_first_uuid(name) = auth.uid());
create policy "avatar delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and public.storage_first_uuid(name) = auth.uid());

create policy "project files read" on storage.objects for select to authenticated
  using (bucket_id = 'project-files' and exists (
    select 1 from public.documents d where d.storage_path = name
      and public.can_read_gated(d.project_id, d.min_role, d.departments)));
create policy "project files upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'project-files' and public.project_role_at_least(storage_first_uuid(name), 'head'));
create policy "project files delete" on storage.objects for delete to authenticated
  using (bucket_id = 'project-files' and public.project_role_at_least(storage_first_uuid(name), 'lead'));

create policy "press read" on storage.objects for select
  using (bucket_id = 'press' and exists (select 1 from public.press_kits k where k.id = public.storage_first_uuid(name)));
create policy "press write" on storage.objects for insert to authenticated
  with check (bucket_id = 'press' and exists (select 1 from public.press_kits k where k.id = public.storage_first_uuid(name)
    and (public.has_perm(k.org_id, 'sites.edit') or (k.project_id is not null and public.project_role_at_least(k.project_id, 'lead')))));

create policy "chat read" on storage.objects for select to authenticated
  using (bucket_id = 'chat' and public.can_read_channel(storage_first_uuid(name)));
create policy "chat upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'chat' and public.can_read_channel(storage_first_uuid(name)));

create policy "submission files read" on storage.objects for select to authenticated
  using (bucket_id = 'submissions' and exists (select 1 from public.submissions s
    where s.id = public.storage_first_uuid(name) and public.has_perm(s.org_id, 'forms.read')));
