'use server';
import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@northem/core/supabase/server';
import { requireCan } from '@/guard';
import { audit, cleanName, isUuid, num, opt, q, rls, str } from '@/util';

export async function createKit(fd: FormData) {
  const s = await requireCan('sites.edit', '/press');
  const db = await supabaseServer();
  const { data, error } = await db.from('press_kits').insert({
    org_id: s.org.id, project_id: isUuid(str(fd, 'project_id', 40)) ? str(fd, 'project_id', 40) : null, title: str(fd, 'title', 200),
    summary: opt(fd, 'summary', 2000), audience: str(fd, 'audience', 10) === 'public' ? 'public' : 'press', embargo_until: opt(fd, 'embargo_until', 20), created_by: s.userId,
  }).select('id').single();
  if (error || !data) redirect(`/press?${q(rls(error?.message, 'Not allowed.'))}`);
  await audit(s, 'press_kit.create', 'press_kits', (data as { id: string }).id);
  redirect(`/press?kit=${(data as { id: string }).id}&${q('Kit created. Add files below.')}`);
}

export async function updateKit(fd: FormData) {
  await requireCan('sites.edit', '/press');
  const id = str(fd, 'id', 40);
  const db = await supabaseServer();
  if (fd.get('delete') === '1') {
    const { data: items } = await db.from('press_kit_items').select('storage_path').eq('kit_id', id);
    const paths = ((items as { storage_path: string | null }[]) ?? []).map((i) => i.storage_path).filter((x): x is string => Boolean(x));
    if (paths.length) await db.storage.from('press').remove(paths);
    await db.from('press_kits').delete().eq('id', id);
    redirect(`/press?${q('Kit deleted.')}`);
  }
  await db.from('press_kits').update({ title: str(fd, 'title', 200), summary: opt(fd, 'summary', 2000), audience: str(fd, 'audience', 10) === 'public' ? 'public' : 'press', embargo_until: opt(fd, 'embargo_until', 20) }).eq('id', id);
  redirect(`/press?kit=${id}&${q('Saved.')}`);
}

export async function addItem(fd: FormData) {
  await requireCan('sites.edit', '/press');
  const kit = str(fd, 'kit_id', 40);
  const db = await supabaseServer();
  const files = fd.getAll('files').filter((f): f is File => f instanceof File && f.size > 0).slice(0, 20);
  const rows: Record<string, unknown>[] = [];
  let sort = num(fd, 'sort') ?? 100;
  for (const f of files) {
    if (f.size > 100 * 1024 * 1024) redirect(`/press?kit=${kit}&${q(`${f.name} is over 100 MB.`)}`);
    const path = `${kit}/${randomUUID()}-${cleanName(f.name)}`;
    const { error } = await db.storage.from('press').upload(path, f, { contentType: f.type || undefined });
    if (error) redirect(`/press?kit=${kit}&${q(`Upload failed: ${error.message}`)}`);
    rows.push({ kit_id: kit, title: str(fd, 'title', 200) && files.length === 1 ? str(fd, 'title', 200) : f.name, kind: f.type.startsWith('image') ? 'image' : f.type.startsWith('video') ? 'video' : 'file', storage_path: path, sort: sort++ });
  }
  const url = str(fd, 'url', 1000);
  const body = str(fd, 'body', 8000);
  if (url) rows.push({ kit_id: kit, title: str(fd, 'title', 200) || url, kind: 'link', url, sort: sort++ });
  if (body) rows.push({ kit_id: kit, title: str(fd, 'title', 200) || 'Note', kind: 'text', body, sort: sort++ });
  if (!rows.length) redirect(`/press?kit=${kit}&${q('Add files, a link or some text.')}`);
  const { error } = await db.from('press_kit_items').insert(rows);
  redirect(`/press?kit=${kit}&${q(error ? rls(error.message, 'Not allowed.') : `${rows.length} added.`)}`);
}

export async function removeItem(fd: FormData) {
  await requireCan('sites.edit', '/press');
  const kit = str(fd, 'kit_id', 40);
  const db = await supabaseServer();
  const { data } = await db.from('press_kit_items').delete().eq('id', str(fd, 'id', 40)).select('storage_path').maybeSingle();
  const path = (data as { storage_path: string | null } | null)?.storage_path;
  if (path) await db.storage.from('press').remove([path]);
  redirect(`/press?kit=${kit}&${q('Removed.')}`);
}
