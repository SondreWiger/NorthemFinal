import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@northem/core/supabase/server';
import { ORG_ROLE_HINT, ORG_ROLE_LABEL, PERMISSIONS, PROJECT_ROLE_LABEL } from '@northem/core/roles';
import { ORG_ROLES, PROJECT_ROLES } from '@northem/core/types';
import { Notice, PageHeader, Submit } from '@northem/ui/app';
import { requireAdmin } from '@/guard';
import { savePermissions } from './actions';

export const metadata: Metadata = { title: 'Roles' };

const PROJECT_HINT: Record<string, string> = {
  guest: 'Sees the project exists and its public bits.',
  cast: 'Call sheets, sides and documents marked for cast. Can add trivia.',
  crew: 'Documents for their departments, photos, diary, tasks.',
  head: 'Everything in their department, and can publish photos and trivia to the public page.',
  lead: 'Everything on the project: team, documents, page, links.',
};

export default async function Roles(props: PageProps<'/roles'>) {
  const sp = await props.searchParams;
  const s = await requireAdmin('/roles');
  if (!s.atLeast('owner')) redirect('/no-access');
  const db = await supabaseServer();
  const { data } = await db.from('role_permissions').select('role, perm').eq('org_id', s.org.id);
  const has = new Set(((data as { role: string; perm: string }[]) ?? []).map((r) => `${r.role}|${r.perm}`));
  const roles = ORG_ROLES.filter((r) => r !== 'owner');
  return (
    <>
      <PageHeader title="Roles & permissions" sub="Team roles decide what someone can do across the organisation. Owners can always do everything." />
      {typeof sp.msg === 'string' ? <Notice kind={sp.msg.includes('saved') ? 'ok' : 'bad'}>{sp.msg}</Notice> : null}
      <section className="card" style={{ marginBottom: 20 }}>
        <form action={savePermissions}>
          <div className="table-wrap">
            <table className="table perm-table">
              <thead><tr><th>Permission</th>{roles.map((r) => <th key={r} title={ORG_ROLE_HINT[r]}>{ORG_ROLE_LABEL[r]}</th>)}<th>Owner</th></tr></thead>
              <tbody>
                {PERMISSIONS.map((p) => (
                  <tr key={p.key}>
                    <td><strong className="small">{p.label}</strong><br /><code className="faint small">{p.key}</code></td>
                    {roles.map((r) => <td key={r} style={{ textAlign: 'center' }}><input type="checkbox" name="grant" value={`${r}|${p.key}`} defaultChecked={has.has(`${r}|${p.key}`)} aria-label={`${ORG_ROLE_LABEL[r]}: ${p.label}`} /></td>)}
                    <td style={{ textAlign: 'center' }}>✓</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12 }}><Submit>Save permissions</Submit></div>
        </form>
      </section>
      <div className="grid-2">
        <section className="card">
          <h2>Team roles</h2>
          <ul className="small">{[...ORG_ROLES].reverse().map((r) => <li key={r}><strong>{ORG_ROLE_LABEL[r]}:</strong> {ORG_ROLE_HINT[r]}</li>)}</ul>
        </section>
        <section className="card">
          <h2>Project roles</h2>
          <p className="small muted">Set per project on its Team tab. Documents can also be limited to departments, so an actor never sees the budget.</p>
          <ul className="small">{[...PROJECT_ROLES].reverse().map((r) => <li key={r}><strong>{PROJECT_ROLE_LABEL[r]}:</strong> {PROJECT_HINT[r]}</li>)}</ul>
        </section>
      </div>
    </>
  );
}
