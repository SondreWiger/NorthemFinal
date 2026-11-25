'use server';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@northem/core/supabase/server';
import type { ThemeTokens } from '@northem/core/types';
import { requireCan } from '@/guard';
import { audit, q, rls, str } from '@/util';

const KEYS = ['bg', 'surface', 'fg', 'muted', 'accent', 'accent2', 'line', 'radius', 'fontDisplay', 'fontBody', 'grain', 'texture', 'hero', 'motion'];

export async function saveTheme(fd: FormData) {
  const s = await requireCan('sites.edit', '/themes');
  const id = str(fd, 'id', 40);
  let tokens: ThemeTokens = {};
  try {
    const raw = JSON.parse(str(fd, 'tokens', 4000) || '{}') as Record<string, unknown>;
    tokens = Object.fromEntries(Object.entries(raw).filter(([k, v]) => KEYS.includes(k) && (typeof v === 'string' || typeof v === 'number'))) as ThemeTokens;
  } catch { redirect(`/themes?edit=${id}&${q('Tokens must be valid JSON.')}`); }
  const db = await supabaseServer();
  const row = { name: str(fd, 'name', 80) || 'Untitled look', tokens, custom_css: str(fd, 'custom_css', 20000) || null };
  const { error } = id ? await db.from('themes').update(row).eq('id', id) : await db.from('themes').insert({ ...row, org_id: s.org.id, layout: {}, created_by: s.userId });
  if (!error) await audit(s, id ? 'theme.update' : 'theme.create', 'themes', id || null, { name: row.name });
  redirect(`/themes?${q(error ? rls(error.message, 'Not allowed.') : 'Saved.')}`);
}

export async function deleteTheme(fd: FormData) {
  await requireCan('sites.edit', '/themes');
  const db = await supabaseServer();
  await db.from('themes').delete().eq('id', str(fd, 'id', 40));
  redirect(`/themes?${q('Deleted. Projects using it fall back to their own settings.')}`);
}
