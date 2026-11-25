'use server';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@northem/core/supabase/server';
import { requireAdmin } from '@/guard';
import { audit, bool, cleanName, num, opt, q, rls, str } from '@/util';

const back = (msg: string) => redirect(`/settings?${q(msg)}`);

export async function saveBranding(fd: FormData) {
  const s = await requireAdmin('/settings');
  if (!s.atLeast('admin')) back('Only admins can change branding.');
  const db = await supabaseServer();
  const branding: Record<string, string> = { ...(s.org.branding as Record<string, string>) };
  for (const k of ['product_name', 'mail_from'] as const) { const v = str(fd, k, 120); if (v) branding[k] = v; else delete branding[k]; }
  const accent = str(fd, 'accent', 9);
  if (/^#[0-9a-f]{6}$/i.test(accent) && fd.get('use_accent') === 'on') branding.accent = accent; else delete branding.accent;
  const logo = fd.get('logo');
  if (logo instanceof File && logo.size > 0) {
    const path = `${s.org.id}/brand/${randomUUID()}-${cleanName(logo.name)}`;
    const { error } = await db.storage.from('public-media').upload(path, logo, { contentType: logo.type || undefined });
    if (error) back(`Logo upload failed: ${error.message}`);
    branding.logo_url = db.storage.from('public-media').getPublicUrl(path).data.publicUrl;
  }
  if (bool(fd, 'clear_logo')) delete branding.logo_url;
  const { error } = await db.from('orgs').update({ name: str(fd, 'name', 80) || s.org.name, branding }).eq('id', s.org.id);
  if (!error) await audit(s, 'org.branding', 'orgs', s.org.id);
  revalidatePath('/', 'layout');
  back(error ? rls(error.message, 'Not allowed.') : 'Branding saved.');
}

export async function saveDivision(fd: FormData) {
  const s = await requireAdmin('/settings');
  const db = await supabaseServer();
  const { error } = await db.from('divisions').update({
    name: str(fd, 'name', 80), tagline: opt(fd, 'tagline', 200), description: opt(fd, 'description', 3000), sort: num(fd, 'sort') ?? 0, is_public: bool(fd, 'is_public'),
  }).eq('id', str(fd, 'id', 40));
  if (!error) await audit(s, 'division.update', 'divisions', str(fd, 'id', 40));
  back(error ? rls(error.message, 'You need the “edit sites” permission.') : 'Division saved.');
}

export async function saveDomain(fd: FormData) {
  const s = await requireAdmin('/settings');
  if (!s.atLeast('owner')) back('Only owners can change domains.');
  const db = await supabaseServer();
  const host = str(fd, 'host', 200).toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (fd.get('delete') === '1') {
    await db.from('org_domains').delete().eq('host', host);
    back('Domain removed.');
  }
  const app = str(fd, 'app', 20);
  if (!/^[a-z0-9.-]+$/.test(host)) back('That host looks wrong.');
  const { error } = await db.from('org_domains').upsert({ host, org_id: s.org.id, app: ['landing', 'division', 'portal', 'admin', 'project'].includes(app) ? app : 'landing', division_id: opt(fd, 'division_id', 40) });
  if (!error) await audit(s, 'domain.save', 'org_domains', host);
  back(error ? rls(error.message, 'Not allowed.') : 'Domain saved. Add it in Vercel and DNS too.');
}
