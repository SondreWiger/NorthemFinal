-- Org-level public images: credited people's photos, logos, general podcast
-- episodes. They live in 'public-media' under <org_id>/..., next to the
-- per-project folders, and only people who manage those things can write.

create policy "org media upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'public-media' and exists (
    select 1 from public.orgs o where o.id = public.storage_first_uuid(name)
      and (public.has_perm(o.id, 'sites.edit') or public.has_perm(o.id, 'people.manage')
           or public.has_perm(o.id, 'podcasts.publish') or public.has_perm(o.id, 'projects.create'))));

create policy "org media delete" on storage.objects for delete to authenticated
  using (bucket_id = 'public-media' and exists (
    select 1 from public.orgs o where o.id = public.storage_first_uuid(name)
      and (public.has_perm(o.id, 'sites.edit') or public.has_perm(o.id, 'people.manage'))));

-- The admin lists who is in the org with their email, which profiles don't hold.
create or replace function public.org_member_emails(p_org uuid)
returns table (user_id uuid, email text)
language sql stable security definer set search_path = public as $$
  select u.id, u.email::text from auth.users u
  join org_members m on m.user_id = u.id and m.org_id = p_org
  where has_perm(p_org, 'people.manage') or has_perm(p_org, 'people.invite');
$$;
revoke all on function public.org_member_emails(uuid) from public, anon;
grant execute on function public.org_member_emails(uuid) to authenticated;
