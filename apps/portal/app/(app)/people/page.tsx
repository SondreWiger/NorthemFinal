import type { Metadata } from 'next';
import { requireMember } from '@northem/core/session';
import { supabaseServer } from '@northem/core/supabase/server';
import { ORG_ROLE_LABEL } from '@northem/core/roles';
import { ORG_ROLES, type OrgRole, type Profile } from '@northem/core/types';
import { Empty, PageHeader, UserAvatar } from '@northem/ui/app';

export const metadata: Metadata = { title: 'People' };

export default async function People(props: PageProps<'/people'>) {
  const sp = await props.searchParams;
  const s = await requireMember('/people');
  const q = typeof sp.q === 'string' ? sp.q.trim().toLowerCase() : '';
  const dept = typeof sp.dept === 'string' ? sp.dept : '';
  const db = await supabaseServer();
  const { data: mem } = await db.from('org_members').select('user_id, role, title, departments').eq('org_id', s.org.id).eq('status', 'active');
  const rows = (mem as { user_id: string; role: OrgRole; title: string | null; departments: string[] }[]) ?? [];
  const { data: profs } = rows.length ? await db.from('profiles').select('*').in('id', rows.map((r) => r.user_id)) : { data: [] };
  const byId = new Map(((profs as Profile[]) ?? []).map((p) => [p.id, p]));
  const depts = [...new Set(rows.flatMap((r) => r.departments))].sort();
  const people = rows
    .map((r) => ({ ...r, p: byId.get(r.user_id) }))
    .filter((r) => (!dept || r.departments.includes(dept)) && (!q || `${r.p?.display_name} ${r.title} ${r.p?.headline} ${r.departments.join(' ')}`.toLowerCase().includes(q)))
    .sort((a, b) => ORG_ROLES.indexOf(b.role) - ORG_ROLES.indexOf(a.role) || (a.p?.display_name ?? '').localeCompare(b.p?.display_name ?? ''));
  return (
    <>
      <PageHeader title="People" sub={`${rows.length} on the team at ${s.org.name}.`} />
      <form className="row" style={{ marginBottom: 16, gap: 8 }}>
        <input className="input" name="q" defaultValue={q} placeholder="Search names, titles, departments" style={{ flex: 1, minWidth: 180 }} />
        <select className="input" name="dept" defaultValue={dept}><option value="">All departments</option>{depts.map((d) => <option key={d}>{d}</option>)}</select>
        <button className="btn">Filter</button>
      </form>
      {people.length ? (
        <div className="grid-auto">
          {people.map((r) => (
            <a key={r.user_id} href={`/people/${r.user_id}`} className="card" style={{ textDecoration: 'none', display: 'flex', gap: 12, alignItems: 'center' }}>
              <UserAvatar name={r.p?.display_name || '?'} src={r.p?.avatar_url} size={48} />
              <span style={{ minWidth: 0 }}>
                <strong style={{ display: 'block' }}>{r.p?.display_name || 'Unnamed'}</strong>
                <small className="muted">{r.title ?? ORG_ROLE_LABEL[r.role]}{r.departments.length ? ` · ${r.departments.join(', ')}` : ''}</small>
              </span>
            </a>
          ))}
        </div>
      ) : <Empty title="Nobody matches">Try another search.</Empty>}
    </>
  );
}
