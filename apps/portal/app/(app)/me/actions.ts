'use server';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getSession } from '@northem/core/session';
import { supabaseServer } from '@northem/core/supabase/server';
import { IntegrationError, PROVIDERS, removeConnection, saveConnection, type Provider } from '@northem/core/integrations';

const back = (msg: string) => redirect(`/me?msg=${encodeURIComponent(msg)}`);
const t = (fd: FormData, k: string, max: number) => String(fd.get(k) ?? '').trim().slice(0, max);

export async function saveProfile(fd: FormData) {
  const s = await getSession();
  if (!s) redirect('/login');
  const db = await supabaseServer();
  let avatar_url = s.profile.avatar_url;
  const file = fd.get('avatar');
  if (file instanceof File && file.size > 0) {
    if (file.size > 5 * 1024 * 1024 || !file.type.startsWith('image/')) back('Photos must be images up to 5 MB.');
    const path = `${s.userId}/${randomUUID()}.${(file.type.split('/')[1] ?? 'jpg').replace(/[^a-z0-9]/g, '')}`;
    const { error } = await db.storage.from('avatars').upload(path, file, { contentType: file.type, upsert: true });
    if (error) back(`Upload failed: ${error.message}`);
    avatar_url = db.storage.from('avatars').getPublicUrl(path).data.publicUrl;
  }
  const handle = t(fd, 'handle', 31).toLowerCase() || null;
  if (handle && !/^[a-z0-9][a-z0-9_.-]{1,30}$/.test(handle)) back('Handles use letters, numbers, dots, dashes and underscores.');
  const labels = fd.getAll('link_label').map(String);
  const links = fd.getAll('link_url').map((u, i) => ({ label: (labels[i] ?? '').trim().slice(0, 40), url: String(u).trim().slice(0, 500) }))
    .filter((l) => /^https?:\/\//.test(l.url)).slice(0, 8);
  const display_name = t(fd, 'display_name', 80);
  if (!display_name) back('Add your name.');
  const { error } = await db.from('profiles').update({
    display_name, handle, headline: t(fd, 'headline', 120) || null, bio: t(fd, 'bio', 2000) || null, location: t(fd, 'location', 80) || null,
    links, avatar_url, is_public: fd.get('is_public') === 'on', onboarded_at: s.profile.onboarded_at ?? new Date().toISOString(),
  }).eq('id', s.userId);
  if (error) back(error.code === '23505' ? 'That handle is taken.' : error.message);
  revalidatePath('/', 'layout');
  back('Saved.');
}

export async function connect(fd: FormData) {
  const s = await getSession();
  if (!s) redirect('/login');
  const provider = String(fd.get('provider')) as Provider;
  const token = t(fd, 'token', 500);
  if (!(provider in PROVIDERS) || !token) back('Paste a token first.');
  try {
    await saveConnection(s.userId, provider, token);
  } catch (e) {
    back(e instanceof IntegrationError ? e.message : 'Could not reach the service.');
  }
  back(`${PROVIDERS[provider].name} connected.`);
}

export async function disconnect(fd: FormData) {
  const s = await getSession();
  if (!s) redirect('/login');
  const provider = String(fd.get('provider')) as Provider;
  if (provider in PROVIDERS) await removeConnection(s.userId, provider);
  back('Disconnected.');
}

export async function setPassword(fd: FormData) {
  const s = await getSession();
  if (!s) redirect('/login');
  const pw = String(fd.get('password') ?? '');
  if (pw.length < 8) back('Use at least 8 characters.');
  const db = await supabaseServer();
  const { error } = await db.auth.updateUser({ password: pw });
  back(error ? error.message : 'Password saved.');
}
