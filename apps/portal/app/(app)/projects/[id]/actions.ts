'use server';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@northem/core/supabase/server';
import { requireMember } from '@northem/core/session';
import { addPersonByEmail } from '@northem/core/invites';
import { ORG_ROLES, PROJECT_ROLES, type OrgRole, type ProjectRole } from '@northem/core/types';

// Every write goes through the signed-in user's client, so row-level security
// decides what is allowed. Errors come back to the page as ?msg=.

const back = (id: string, tab: string, msg?: string) =>
  redirect(`/projects/${id}?tab=${tab}${msg ? `&msg=${encodeURIComponent(msg)}` : ''}`);

const s = (fd: FormData, k: string, max = 2000) => String(fd.get(k) ?? '').trim().slice(0, max);
const list = (fd: FormData, k: string) => fd.getAll(k).flatMap((v) => String(v).split(',')).map((v) => v.trim().toLowerCase()).filter(Boolean);
const cleanName = (n: string) => n.normalize('NFKD').replace(/[^\w.-]+/g, '-').slice(-80) || 'file';

export async function addDocument(fd: FormData) {
  await requireMember();
  const id = s(fd, 'project_id', 40);
  const db = await supabaseServer();
  const { data: u } = await db.auth.getUser();
  const file = fd.get('file');
  const url = s(fd, 'url', 1000);
  const minRole = s(fd, 'min_role', 10) as ProjectRole;
  const row = {
    project_id: id, title: s(fd, 'title', 200), category: s(fd, 'category', 40) || 'general',
    min_role: PROJECT_ROLES.includes(minRole) ? minRole : 'crew', departments: list(fd, 'departments'),
    pinned: fd.get('pinned') === 'on', created_by: u.user?.id,
  };
  let storage_path: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > 50 * 1024 * 1024) back(id, 'docs', 'Files up to 50 MB. Link bigger ones instead.');
    storage_path = `${id}/${randomUUID()}-${cleanName(file.name)}`;
    const { error } = await db.storage.from('project-files').upload(storage_path, file, { contentType: file.type || 'application/octet-stream' });
    if (error) back(id, 'docs', `Upload failed: ${error.message}`);
  } else if (!url) back(id, 'docs', 'Add a file or a link.');
  const { error } = await db.from('documents').insert({
    ...row, title: row.title || (file instanceof File && file.size ? file.name : url), source: storage_path ? 'upload' : 'link', storage_path, url: storage_path ? null : url,
  });
  if (error) {
    if (storage_path) await db.storage.from('project-files').remove([storage_path]);
    back(id, 'docs', error.message.includes('row-level') ? "You can't add documents to this project." : error.message);
  }
  revalidatePath(`/projects/${id}`);
  back(id, 'docs', 'Document added.');
}

export async function deleteDocument(fd: FormData) {
  const id = s(fd, 'project_id', 40);
  const db = await supabaseServer();
  const { data } = await db.from('documents').delete().eq('id', s(fd, 'doc_id', 40)).select('storage_path').maybeSingle();
  const path = (data as { storage_path: string | null } | null)?.storage_path;
  if (path) await db.storage.from('project-files').remove([path]);
  back(id, 'docs', data ? 'Removed.' : "You can't remove that one.");
}

export async function addMedia(fd: FormData) {
  await requireMember();
  const id = s(fd, 'project_id', 40);
  const db = await supabaseServer();
  const { data: u } = await db.auth.getUser();
  const files = fd.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
  const url = s(fd, 'url', 1000);
  const base = { project_id: id, kind: s(fd, 'kind', 20) || 'bts', caption: s(fd, 'caption', 300) || null, story: s(fd, 'story', 2000) || null,
    location: s(fd, 'location', 120) || null, taken_at: s(fd, 'taken_at', 10) || null, is_public: fd.get('is_public') === 'on', uploaded_by: u.user?.id };
  const rows: Record<string, unknown>[] = [];
  for (const f of files.slice(0, 20)) {
    if (f.size > 25 * 1024 * 1024) back(id, 'media', `${f.name} is over 25 MB.`);
    const path = `${id}/${randomUUID()}-${cleanName(f.name)}`;
    const { error } = await db.storage.from('public-media').upload(path, f, { contentType: f.type || undefined });
    if (error) back(id, 'media', `Upload failed: ${error.message}`);
    rows.push({ ...base, storage_path: path, kind: f.type.startsWith('video') && base.kind !== 'blooper' ? 'video' : base.kind });
  }
  if (url) rows.push({ ...base, external_url: url });
  if (!rows.length) back(id, 'media', 'Choose photos or paste a video link.');
  const { error } = await db.from('media').insert(rows);
  if (error) back(id, 'media', error.message.includes('row-level') ? 'Only heads of department and leads can publish to the public page. Uncheck "public" and try again.' : error.message);
  revalidatePath(`/projects/${id}`);
  back(id, 'media', `${rows.length} added.`);
}

export async function toggleMediaPublic(fd: FormData) {
  const id = s(fd, 'project_id', 40);
  const db = await supabaseServer();
  const { data, error } = await db.from('media').update({ is_public: fd.get('value') === 'true' }).eq('id', s(fd, 'media_id', 40)).select('id');
  back(id, 'media', error || !data?.length ? "You can't publish that." : 'Updated.');
}

export async function deleteMedia(fd: FormData) {
  const id = s(fd, 'project_id', 40);
  const db = await supabaseServer();
  const { data } = await db.from('media').delete().eq('id', s(fd, 'media_id', 40)).select('storage_path').maybeSingle();
  const path = (data as { storage_path: string | null } | null)?.storage_path;
  if (path) await db.storage.from('public-media').remove([path]);
  back(id, 'media', data ? 'Removed.' : "You can't remove that one.");
}

export async function addTrivia(fd: FormData) {
  const id = s(fd, 'project_id', 40);
  const db = await supabaseServer();
  const { data: u } = await db.auth.getUser();
  const { error } = await db.from('trivia').insert({ project_id: id, kind: s(fd, 'kind', 20) || 'trivia', body: s(fd, 'body', 1500), created_by: u.user?.id, is_public: fd.get('is_public') === 'on' });
  back(id, 'story', error ? (error.message.includes('row-level') ? 'Only heads and leads can publish straight to the public page.' : error.message) : 'Added.');
}

export async function addMoment(fd: FormData) {
  const id = s(fd, 'project_id', 40);
  const db = await supabaseServer();
  const { data: u } = await db.auth.getUser();
  const { error } = await db.from('moments').insert({
    project_id: id, title: s(fd, 'title', 200), body: s(fd, 'body', 4000) || null, mood: s(fd, 'mood', 8) || null,
    happened_on: s(fd, 'happened_on', 10) || new Date().toISOString().slice(0, 10), created_by: u.user?.id, is_public: fd.get('is_public') === 'on',
  });
  back(id, 'story', error ? (error.message.includes('row-level') ? 'Only heads and leads can publish straight to the public page.' : error.message) : 'Added to the diary.');
}

export async function deleteStory(fd: FormData) {
  const id = s(fd, 'project_id', 40);
  const table = s(fd, 'table', 10) === 'moments' ? 'moments' : 'trivia';
  const db = await supabaseServer();
  const { data } = await db.from(table).delete().eq('id', s(fd, 'row_id', 40)).select('id');
  back(id, 'story', data?.length ? 'Removed.' : "You can't remove that one.");
}

export async function addMember(fd: FormData) {
  const session = await requireMember();
  const id = s(fd, 'project_id', 40);
  const role = s(fd, 'project_role', 10) as ProjectRole;
  const orgRole = s(fd, 'org_role', 10) as OrgRole;
  const res = await addPersonByEmail(session, {
    email: s(fd, 'email', 320), projectId: id, projectRole: PROJECT_ROLES.includes(role) ? role : 'crew',
    orgRole: ORG_ROLES.includes(orgRole) ? orgRole : role === 'cast' ? 'cast' : 'crew',
    departments: list(fd, 'departments'), title: s(fd, 'title', 120) || null, personId: s(fd, 'person_id', 40) || null, message: s(fd, 'message', 600) || null,
  });
  revalidatePath(`/projects/${id}`);
  back(id, 'team', res.ok ? (res.mode === 'added' ? `Added.${res.mailed ? ' They got a mail.' : ''}` : (res.mailed ? 'Invite sent.' : `Mail isn't set up, so send this link yourself (shown once): ${res.link}`)) : res.error);
}

export async function updateMember(fd: FormData) {
  const id = s(fd, 'project_id', 40);
  const role = s(fd, 'role', 10) as ProjectRole;
  const db = await supabaseServer();
  const { data, error } = await db.from('project_members').update({
    role: PROJECT_ROLES.includes(role) ? role : 'crew', title: s(fd, 'title', 120) || null, departments: list(fd, 'departments'),
  }).eq('project_id', id).eq('user_id', s(fd, 'user_id', 40)).select('user_id');
  back(id, 'team', error || !data?.length ? 'Only project leads can change roles.' : 'Saved.');
}

export async function removeMember(fd: FormData) {
  const id = s(fd, 'project_id', 40);
  const db = await supabaseServer();
  const { data } = await db.from('project_members').delete().eq('project_id', id).eq('user_id', s(fd, 'user_id', 40)).select('user_id');
  back(id, 'team', data?.length ? 'Removed from the project.' : "You can't remove them.");
}

export async function addLink(fd: FormData) {
  const id = s(fd, 'project_id', 40);
  const provider = s(fd, 'provider', 30);
  const db = await supabaseServer();
  const { data: u } = await db.auth.getUser();
  const minRole = s(fd, 'min_role', 10) as ProjectRole;
  const { error } = await db.from('project_links').insert({
    project_id: id, provider, external_id: s(fd, 'external_id', 200), external_url: s(fd, 'external_url', 1000) || null,
    label: s(fd, 'label', 120) || null, min_role: PROJECT_ROLES.includes(minRole) ? minRole : 'crew', created_by: u.user?.id,
  });
  back(id, s(fd, 'tab', 20) || 'overview', error ? (error.code === '23505' ? 'Already linked.' : error.message.includes('row-level') ? 'Only project leads can link tools.' : error.message) : 'Linked.');
}

export async function removeLink(fd: FormData) {
  const id = s(fd, 'project_id', 40);
  const db = await supabaseServer();
  await db.from('project_links').delete().eq('id', s(fd, 'link_id', 40));
  back(id, s(fd, 'tab', 20) || 'overview', 'Unlinked.');
}
