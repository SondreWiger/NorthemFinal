'use server';
import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@northem/core/supabase/server';
import { requireAdmin } from '@/guard';
import { audit, bool, cleanName, isUuid, num, opt, q, rls, str } from '@/util';

const SOURCES = ['internal', 'spotify', 'youtube', 'apple', 'soundcloud', 'other'];

export async function saveEpisode(fd: FormData) {
  const s = await requireAdmin('/podcasts');
  const db = await supabaseServer();
  const projectId = str(fd, 'project_id', 40);
  const url = str(fd, 'external_url', 1000);
  const file = fd.get('file');
  let storage_path: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > 200 * 1024 * 1024) redirect(`/podcasts?${q('Audio up to 200 MB. Link bigger files.')}`);
    storage_path = `${isUuid(projectId) ? projectId : s.org.id}/podcast/${randomUUID()}-${cleanName(file.name)}`;
    const { error } = await db.storage.from('public-media').upload(storage_path, file, { contentType: file.type || 'audio/mpeg' });
    if (error) redirect(`/podcasts?${q(`Upload failed: ${error.message}`)}`);
  }
  let source = str(fd, 'source', 20);
  if (storage_path) source = 'internal';
  else if (!SOURCES.includes(source) || source === 'internal') source = /spotify/.test(url) ? 'spotify' : /youtu/.test(url) ? 'youtube' : /apple/.test(url) ? 'apple' : /soundcloud/.test(url) ? 'soundcloud' : 'other';
  if (!storage_path && !url) redirect(`/podcasts?${q('Upload audio or paste a Spotify / YouTube link.')}`);
  const mins = num(fd, 'minutes');
  const publish = bool(fd, 'is_public');
  const { data, error } = await db.from('podcast_episodes').insert({
    org_id: s.org.id, project_id: isUuid(projectId) ? projectId : null, title: str(fd, 'title', 200), description: opt(fd, 'description', 4000),
    source, storage_path, external_url: storage_path ? null : url, duration_seconds: mins ? Math.round(mins * 60) : null, episode_number: num(fd, 'episode_number'),
    is_public: publish, published_at: publish ? new Date().toISOString() : null, created_by: s.userId,
  }).select('id').single();
  if (error || !data) redirect(`/podcasts?${q(rls(error?.message, 'You need podcast rights, or lead the project.'))}`);
  const eid = (data as { id: string }).id;
  const guests = fd.getAll('guests').map(String).filter(isUuid);
  const hosts = fd.getAll('hosts').map(String).filter(isUuid);
  const rows = [...hosts.map((p) => ({ episode_id: eid, person_id: p, role: 'host' })), ...guests.filter((g) => !hosts.includes(g)).map((p) => ({ episode_id: eid, person_id: p, role: 'guest' }))];
  if (rows.length) await db.from('podcast_guests').insert(rows);
  await audit(s, 'podcast.create', 'podcast_episodes', eid);
  redirect(`/podcasts?${q('Episode added.')}`);
}

export async function episodeAction(fd: FormData) {
  await requireAdmin('/podcasts');
  const db = await supabaseServer();
  const id = str(fd, 'id', 40);
  const op = str(fd, 'op', 10);
  if (op === 'delete') await db.from('podcast_episodes').delete().eq('id', id);
  else {
    const on = op === 'publish';
    await db.from('podcast_episodes').update({ is_public: on, ...(on ? { published_at: new Date().toISOString() } : {}) }).eq('id', id);
  }
  redirect(`/podcasts?${q(op === 'delete' ? 'Deleted.' : 'Updated.')}`);
}
