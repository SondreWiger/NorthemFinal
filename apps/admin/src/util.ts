import 'server-only';
import { supabaseAdmin, hasServiceRole } from '@northem/core/supabase/admin';
import type { Session } from '@northem/core/session';

export const str = (fd: FormData, k: string, max = 2000) => String(fd.get(k) ?? '').trim().slice(0, max);
export const opt = (fd: FormData, k: string, max = 2000) => str(fd, k, max) || null;
export const num = (fd: FormData, k: string) => { const v = Number(str(fd, k, 20)); return str(fd, k, 20) && Number.isFinite(v) ? v : null; };
export const bool = (fd: FormData, k: string) => fd.get(k) === 'on' || fd.get(k) === 'true';
export const list = (fd: FormData, k: string) => fd.getAll(k).flatMap((v) => String(v).split(',')).map((v) => v.trim()).filter(Boolean);
export const isUuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v);
export const cleanName = (n: string) => n.normalize('NFKD').replace(/[^\w.-]+/g, '-').slice(-80) || 'file';
export const q = (msg: string) => `msg=${encodeURIComponent(msg)}`;
export const rls = (m: string | undefined, fallback: string) => (m?.includes('row-level') || m?.includes('permission') ? fallback : m ?? fallback);

/** Best-effort audit trail. The table has no insert policy, so this needs the service key. */
export async function audit(s: Session, action: string, table: string, id: string | null, detail: Record<string, unknown> = {}) {
  if (!hasServiceRole()) return;
  await supabaseAdmin().from('audit_log').insert({ org_id: s.org.id, actor_id: s.userId, action, target_table: table, target_id: id, detail });
}

export function linesToLinks(labels: FormDataEntryValue[], urls: FormDataEntryValue[]) {
  return urls.map((u, i) => ({ label: String(labels[i] ?? '').trim().slice(0, 40), url: String(u).trim().slice(0, 500) }))
    .filter((l) => /^https?:\/\//.test(l.url)).slice(0, 10);
}
