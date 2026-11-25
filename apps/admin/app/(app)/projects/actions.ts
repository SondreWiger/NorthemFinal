'use server';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@northem/core/supabase/server';
import { slugify } from '@northem/core/format';
import { PROJECT_KINDS, PROJECT_STATUSES, type PageBlock, type ThemeTokens } from '@northem/core/types';
import { requireAdmin, requireCan } from '@/guard';
import { audit, bool, cleanName, isUuid, list, num, opt, q, rls, str } from '@/util';

type Db = Awaited<ReturnType<typeof supabaseServer>>;
const back = (id: string, tab: string, msg: string) => redirect(`/projects/${id}?tab=${tab}&${q(msg)}`);
const VIS = ['private', 'internal', 'unlisted', 'public'];

async function upload(db: Db, folder: string, file: FormDataEntryValue | null, max = 15): Promise<string | null | false> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > max * 1024 * 1024) return false;
  const path = `${folder}/${randomUUID()}-${cleanName(file.name)}`;
  const { error } = await db.storage.from('public-media').upload(path, file, { contentType: file.type || undefined });
  if (error) return false;
  return db.storage.from('public-media').getPublicUrl(path).data.publicUrl;
}

export async function createProject(fd: FormData) {
  const s = await requireCan('projects.create', '/projects/new');
  const title = str(fd, 'title', 200);
  if (!title) redirect(`/projects/new?${q('Give it a title.')}`);
  const kind = str(fd, 'kind', 30);
  const status = str(fd, 'status', 30);
  const db = await supabaseServer();
  const { data, error } = await db.from('projects').insert({
    org_id: s.org.id, title, slug: slugify(str(fd, 'slug', 80) || title), division_id: opt(fd, 'division_id', 40),
    kind: (PROJECT_KINDS as readonly string[]).includes(kind) ? kind : 'other', status: (PROJECT_STATUSES as readonly string[]).includes(status) ? status : 'idea',
    logline: opt(fd, 'logline', 300), year: num(fd, 'year'), visibility: 'private',
  }).select('id').single();
  if (error || !data) redirect(`/projects/new?${q(error?.code === '23505' ? 'That web address is taken. Change the slug.' : rls(error?.message, "You can't create projects."))}`);
  const id = (data as { id: string }).id;
  const sps = str(fd, 'sps_project', 200);
  if (sps) {
    const [extId, label] = sps.split('|');
    await db.from('project_links').insert({ project_id: id, provider: 'screenplay_studio', external_id: extId, label: label || null, min_role: 'crew' });
  }
  await audit(s, 'project.create', 'projects', id, { title });
  redirect(`/projects/${id}?tab=details&${q('Project created. You are its lead.')}`);
}

export async function saveDetails(fd: FormData) {
  const s = await requireAdmin('/projects');
  const id = str(fd, 'id', 40);
  const db = await supabaseServer();
  const kind = str(fd, 'kind', 30);
  const status = str(fd, 'status', 30);
  const vis = str(fd, 'visibility', 20);
  const poster = await upload(db, id, fd.get('poster'));
  const cover = await upload(db, id, fd.get('cover'));
  if (poster === false || cover === false) back(id, 'details', 'Image upload failed. Images up to 15 MB.');
  const stats = Object.fromEntries(str(fd, 'stats', 3000).split('\n').map((l) => l.split(':')).filter((p) => p.length >= 2 && p[0]!.trim())
    .map(([k, ...v]) => { const val = v.join(':').trim(); return [k!.trim().slice(0, 60), /^-?\d+(\.\d+)?$/.test(val) ? Number(val) : val.slice(0, 60)]; }));
  const publish = bool(fd, 'published');
  const { data: cur } = await db.from('projects').select('published_at').eq('id', id).maybeSingle();
  const wasPublished = Boolean((cur as { published_at: string | null } | null)?.published_at);
  const patch: Record<string, unknown> = {
    title: str(fd, 'title', 200), slug: slugify(str(fd, 'slug', 80) || str(fd, 'title', 200)), division_id: opt(fd, 'division_id', 40),
    kind: (PROJECT_KINDS as readonly string[]).includes(kind) ? kind : 'other', status: (PROJECT_STATUSES as readonly string[]).includes(status) ? status : 'idea',
    logline: opt(fd, 'logline', 300), synopsis: opt(fd, 'synopsis', 8000), year: num(fd, 'year'), release_date: opt(fd, 'release_date', 10),
    runtime_minutes: num(fd, 'runtime_minutes'), locations: list(fd, 'locations').slice(0, 20), genres: list(fd, 'genres').slice(0, 10),
    client: opt(fd, 'client', 120), trailer_url: opt(fd, 'trailer_url', 500), visibility: VIS.includes(vis) ? vis : 'private', stats,
    published_at: publish ? (wasPublished ? undefined : new Date().toISOString()) : null,
  };
  if (patch.published_at === undefined) delete patch.published_at;
  if (poster) patch.poster_url = poster;
  if (cover) patch.cover_url = cover;
  if (bool(fd, 'clear_poster')) patch.poster_url = null;
  const { data, error } = await db.from('projects').update(patch).eq('id', id).select('id');
  if (error || !data?.length) back(id, 'details', error?.code === '23505' ? 'That web address is taken.' : rls(error?.message, 'Only project leads can edit this.'));
  if (publish !== wasPublished) await audit(s, publish ? 'project.publish' : 'project.unpublish', 'projects', id);
  revalidatePath(`/projects/${id}`);
  back(id, 'details', publish && patch.visibility !== 'public' && patch.visibility !== 'unlisted' ? 'Saved. Set visibility to Public or Unlisted for the page to go live.' : 'Saved.');
}

export async function savePage(fd: FormData) {
  await requireAdmin('/projects');
  const id = str(fd, 'id', 40);
  const db = await supabaseServer();
  const tokens: ThemeTokens = {};
  for (const k of ['bg', 'surface', 'fg', 'muted', 'accent', 'accent2', 'line'] as const) {
    const v = str(fd, k, 20);
    if (/^#[0-9a-f]{3,8}$/i.test(v) && fd.get(`use_${k}`) === 'on') tokens[k] = v;
  }
  const radius = str(fd, 'radius', 10); if (/^\d{1,2}px$/.test(radius)) tokens.radius = radius;
  const texture = str(fd, 'texture', 10); if (['none', 'grain', 'frost', 'ash', 'grid', 'paper', 'scan'].includes(texture)) tokens.texture = texture as ThemeTokens['texture'];
  const hero = str(fd, 'hero', 10); if (['poster', 'fullbleed', 'split', 'type'].includes(hero)) tokens.hero = hero as ThemeTokens['hero'];
  const motion = str(fd, 'motion', 10); if (['calm', 'lively', 'none'].includes(motion)) tokens.motion = motion as ThemeTokens['motion'];
  const grain = num(fd, 'grain'); if (grain !== null) tokens.grain = Math.max(0, Math.min(1, grain));
  const fd1 = str(fd, 'fontDisplay', 40); if (fd1) tokens.fontDisplay = fd1;
  const fb = str(fd, 'fontBody', 40); if (fb) tokens.fontBody = fb;

  let blocks: PageBlock[] = [];
  try {
    const raw = JSON.parse(str(fd, 'blocks', 30000) || '[]') as PageBlock[];
    blocks = Array.isArray(raw) ? raw.filter((b) => b && typeof b.type === 'string').slice(0, 40) : [];
  } catch { back(id, 'page', 'The section list was not valid.'); }
  const themeId = str(fd, 'theme_id', 40);
  const { data, error } = await db.from('projects').update({ theme_overrides: tokens, page_blocks: blocks, theme_id: isUuid(themeId) ? themeId : null }).eq('id', id).select('org_id, title');
  if (error || !data?.length) back(id, 'page', rls(error?.message, 'Only project leads can edit the page.'));
  // Hand-written CSS lives on the project's own theme row.
  const css = str(fd, 'custom_css', 20000);
  if (fd.has('custom_css')) {
    const proj = (data as { org_id: string; title: string }[])[0]!;
    if (isUuid(themeId)) {
      await db.from('themes').update({ custom_css: css || null }).eq('id', themeId);
    } else if (css) {
      const { data: t } = await db.from('themes').insert({ org_id: proj.org_id, name: `${proj.title} (own)`, tokens: {}, layout: {}, custom_css: css }).select('id').single();
      if (t) await db.from('projects').update({ theme_id: (t as { id: string }).id }).eq('id', id);
      else back(id, 'page', 'Saved, but custom CSS needs the “edit sites” permission.');
    }
  }
  if (bool(fd, 'save_as_theme')) {
    const proj = (data as { org_id: string; title: string }[])[0]!;
    await db.from('themes').insert({ org_id: proj.org_id, name: str(fd, 'theme_name', 80) || `${proj.title} look`, tokens, layout: { blocks }, custom_css: css || null });
  }
  revalidatePath(`/projects/${id}`);
  back(id, 'page', 'Page saved.');
}

/** Credit someone: an existing credited person, a team member (person made on the fly), or a new name. */
export async function addCredit(fd: FormData) {
  const s = await requireAdmin('/projects');
  const id = str(fd, 'id', 40);
  const db = await supabaseServer();
  let personId = str(fd, 'person_id', 40);
  const memberId = str(fd, 'member_id', 40);
  const newName = str(fd, 'new_name', 120);
  if (!isUuid(personId) && isUuid(memberId)) {
    const { data: existing } = await db.from('people').select('id').eq('org_id', s.org.id).eq('profile_id', memberId).maybeSingle();
    if (existing) personId = (existing as { id: string }).id;
    else {
      const { data: prof } = await db.from('profiles').select('display_name, headline, avatar_url, bio').eq('id', memberId).maybeSingle();
      const p = prof as { display_name: string; headline: string | null; avatar_url: string | null; bio: string | null } | null;
      if (!p) back(id, 'credits', 'Could not find that team member.');
      const { data: made, error } = await db.from('people').insert({
        org_id: s.org.id, name: p!.display_name || 'Unnamed', slug: `${slugify(p!.display_name || 'person')}-${randomUUID().slice(0, 4)}`,
        known_for: p!.headline, photo_url: p!.avatar_url, bio: p!.bio, profile_id: memberId, created_by: s.userId,
      }).select('id').single();
      if (error || !made) back(id, 'credits', rls(error?.message, "You can't create people."));
      personId = (made as { id: string }).id;
    }
  } else if (!isUuid(personId) && newName) {
    const { data: made, error } = await db.from('people').insert({
      org_id: s.org.id, name: newName, slug: `${slugify(newName)}-${randomUUID().slice(0, 4)}`, known_for: opt(fd, 'job', 80), created_by: s.userId,
    }).select('id').single();
    if (error || !made) back(id, 'credits', rls(error?.message, "You can't create people."));
    personId = (made as { id: string }).id;
  }
  if (!isUuid(personId)) back(id, 'credits', 'Pick a person, a team member, or type a new name.');
  const { error } = await db.from('credits').insert({
    project_id: id, person_id: personId, department: str(fd, 'department', 40) || 'crew', job: str(fd, 'job', 120) || 'Crew',
    character_name: opt(fd, 'character_name', 120), billing: num(fd, 'billing') ?? 100, note: opt(fd, 'note', 200), is_public: bool(fd, 'is_public'),
  });
  if (error) back(id, 'credits', rls(error.message, 'Only project leads can credit people.'));
  revalidatePath(`/projects/${id}`);
  back(id, 'credits', 'Credited.');
}

export async function updateCredit(fd: FormData) {
  await requireAdmin('/projects');
  const id = str(fd, 'id', 40);
  const db = await supabaseServer();
  if (fd.get('delete') === '1') await db.from('credits').delete().eq('id', str(fd, 'credit_id', 40));
  else await db.from('credits').update({ job: str(fd, 'job', 120), department: str(fd, 'department', 40), character_name: opt(fd, 'character_name', 120), billing: num(fd, 'billing') ?? 100, is_public: bool(fd, 'is_public') }).eq('id', str(fd, 'credit_id', 40));
  back(id, 'credits', fd.get('delete') === '1' ? 'Credit removed.' : 'Saved.');
}

export async function togglePublic(fd: FormData) {
  await requireAdmin('/projects');
  const id = str(fd, 'id', 40);
  const table = str(fd, 'table', 10);
  if (!['media', 'trivia', 'moments'].includes(table)) back(id, 'public', 'Unknown item.');
  const db = await supabaseServer();
  const rowId = str(fd, 'row_id', 40);
  const { data } = fd.get('delete') === '1'
    ? await db.from(table).delete().eq('id', rowId).select('id')
    : await db.from(table).update({ is_public: fd.get('value') === 'true' }).eq('id', rowId).select('id');
  back(id, 'public', data?.length ? 'Updated.' : 'Only heads and leads can change that.');
}

export async function addPublicMedia(fd: FormData) {
  const s = await requireAdmin('/projects');
  const id = str(fd, 'id', 40);
  const db = await supabaseServer();
  const files = fd.getAll('files').filter((f): f is File => f instanceof File && f.size > 0).slice(0, 30);
  const kind = str(fd, 'kind', 20) || 'still';
  const rows: Record<string, unknown>[] = [];
  for (const f of files) {
    if (f.size > 25 * 1024 * 1024) back(id, 'public', `${f.name} is over 25 MB.`);
    const path = `${id}/${randomUUID()}-${cleanName(f.name)}`;
    const { error } = await db.storage.from('public-media').upload(path, f, { contentType: f.type || undefined });
    if (error) back(id, 'public', `Upload failed: ${error.message}`);
    rows.push({ project_id: id, kind: f.type.startsWith('video') && kind !== 'blooper' ? 'video' : kind, storage_path: path, caption: opt(fd, 'caption', 300), story: opt(fd, 'story', 2000), is_public: bool(fd, 'is_public'), uploaded_by: s.userId });
  }
  const url = str(fd, 'url', 1000);
  if (url) rows.push({ project_id: id, kind: kind === 'blooper' ? 'blooper' : 'video', external_url: url, caption: opt(fd, 'caption', 300), story: opt(fd, 'story', 2000), is_public: bool(fd, 'is_public'), uploaded_by: s.userId });
  if (!rows.length) back(id, 'public', 'Choose files or paste a video link.');
  const { error } = await db.from('media').insert(rows);
  back(id, 'public', error ? rls(error.message, 'Only heads and leads can publish.') : `${rows.length} added.`);
}

export async function addTrivia(fd: FormData) {
  const s = await requireAdmin('/projects');
  const id = str(fd, 'id', 40);
  const db = await supabaseServer();
  const { error } = await db.from('trivia').insert({ project_id: id, kind: str(fd, 'kind', 20) || 'trivia', body: str(fd, 'body', 1500), person_id: opt(fd, 'person_id', 40), is_public: bool(fd, 'is_public'), created_by: s.userId });
  back(id, 'public', error ? rls(error.message, 'Only heads and leads can publish.') : 'Added.');
}

export async function saveLink(fd: FormData) {
  const s = await requireAdmin('/projects');
  const id = str(fd, 'id', 40);
  const db = await supabaseServer();
  if (fd.get('delete') === '1') {
    await db.from('project_links').delete().eq('id', str(fd, 'link_id', 40));
    back(id, 'links', 'Unlinked.');
  }
  const raw = str(fd, 'external', 500);
  const [extId, label] = raw.includes('|') ? raw.split('|') : [raw, null];
  const { error } = await db.from('project_links').insert({
    project_id: id, provider: str(fd, 'provider', 30), external_id: extId!.trim(), external_url: opt(fd, 'external_url', 1000), label: str(fd, 'label', 120) || label, min_role: str(fd, 'min_role', 10) || 'crew', created_by: s.userId,
  });
  back(id, 'links', error ? (error.code === '23505' ? 'Already linked.' : rls(error.message, 'Only project leads can link tools.')) : 'Linked.');
}

export async function deleteProject(fd: FormData) {
  const s = await requireAdmin('/projects');
  const id = str(fd, 'id', 40);
  if (str(fd, 'confirm', 200) !== str(fd, 'title', 200)) back(id, 'details', 'Type the title exactly to delete.');
  const db = await supabaseServer();
  const { data } = await db.from('projects').delete().eq('id', id).select('id');
  if (!data?.length) back(id, 'details', 'Only admins can delete projects.');
  await audit(s, 'project.delete', 'projects', id, { title: str(fd, 'title', 200) });
  redirect(`/projects?${q('Deleted.')}`);
}
