import type { Metadata } from 'next';
import { supabaseServer } from '@northem/core/supabase/server';
import { dateLabel, timeAgo } from '@northem/core/format';
import type { Profile } from '@northem/core/types';
import { Empty, PageHeader } from '@northem/ui/app';
import { requireCan } from '@/guard';

export const metadata: Metadata = { title: 'Audit log' };

export default async function Audit() {
  const s = await requireCan('audit.read', '/audit');
  const db = await supabaseServer();
  const { data } = await db.from('audit_log').select('*').eq('org_id', s.org.id).order('created_at', { ascending: false }).limit(300);
  const rows = (data as { id: number; actor_id: string | null; action: string; target_table: string | null; target_id: string | null; detail: Record<string, unknown>; created_at: string }[]) ?? [];
  const ids = [...new Set(rows.map((r) => r.actor_id ?? ''))].filter(Boolean);
  const { data: profs } = ids.length ? await db.from('profiles').select('id, display_name').in('id', ids) : { data: [] };
  const who = new Map(((profs as Pick<Profile, 'id' | 'display_name'>[]) ?? []).map((p) => [p.id, p.display_name]));
  return (
    <>
      <PageHeader title="Audit log" sub="Who changed roles, sent invites, published pages and handled the inbox. The last 300 events." />
      {rows.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>When</th><th>Who</th><th>What</th><th>Detail</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td title={dateLabel(r.created_at)}><small>{timeAgo(r.created_at)}</small></td>
                  <td><small>{who.get(r.actor_id ?? '') || 'System'}</small></td>
                  <td><code className="small">{r.action}</code></td>
                  <td><small className="muted">{Object.entries(r.detail ?? {}).filter(([, v]) => v != null).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ')}</small></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty title="Nothing logged yet" />}
    </>
  );
}
