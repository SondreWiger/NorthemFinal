import type { Metadata } from 'next';
import { supabaseServer } from '@northem/core/supabase/server';
import { DEPARTMENTS, ORG_ROLE_HINT, ORG_ROLE_LABEL } from '@northem/core/roles';
import { dateLabel, timeAgo } from '@northem/core/format';
import { ORG_ROLES, type Invite, type OrgMember, type OrgRole, type Profile } from '@northem/core/types';
import { ConfirmSubmit, Empty, Notice, PageHeader, Submit, UserAvatar } from '@northem/ui/app';
import { requireAdmin } from '@/guard';
import { invite, revokeInvite, updateMember } from './actions';

export const metadata: Metadata = { title: 'Team' };

export default async function Team(props: PageProps<'/team'>) {
  const sp = await props.searchParams;
  const s = await requireAdmin('/team');
  const db = await supabaseServer();
  const [{ data: mem }, { data: inv }, { data: emails }] = await Promise.all([
    db.from('org_members').select('*').eq('org_id', s.org.id).order('joined_at'),
    s.can('people.invite') ? db.from('invites').select('*, project:projects(title)').eq('org_id', s.org.id).order('created_at', { ascending: false }).limit(60) : Promise.resolve({ data: [] }),
    db.rpc('org_member_emails', { p_org: s.org.id }),
  ]);
  const members = (mem as OrgMember[]) ?? [];
  const mail = new Map(((emails as { user_id: string; email: string }[]) ?? []).map((e) => [e.user_id, e.email]));
  const { data: profs } = members.length ? await db.from('profiles').select('id, display_name, avatar_url').in('id', members.map((m) => m.user_id)) : { data: [] };
  const who = new Map(((profs as Pick<Profile, 'id' | 'display_name' | 'avatar_url'>[]) ?? []).map((p) => [p.id, p]));
  const invites = (inv as (Invite & { project: { title: string } | null })[]) ?? [];
  const canManage = s.can('people.manage');
  const grantable = ORG_ROLES.filter((r) => s.role === 'owner' || ORG_ROLES.indexOf(r) < ORG_ROLES.indexOf(s.role));
  const sorted = [...members].sort((a, b) => (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1) || ORG_ROLES.indexOf(b.role) - ORG_ROLES.indexOf(a.role));
  const now = Date.now();
  return (
    <>
      <PageHeader title="Team & invites" sub={`${members.filter((m) => m.status === 'active').length} active at ${s.org.name}. Roles decide what people see in the portal; project roles narrow it per production.`} />
      {typeof sp.msg === 'string' ? <Notice kind={/sent|saved|revoked|team now|link yourself/i.test(sp.msg) ? 'ok' : 'bad'}>{sp.msg}</Notice> : null}
      {s.can('people.invite') ? (
        <section className="card" style={{ marginBottom: 20 }}>
          <h2>Invite someone</h2>
          <p className="muted small" style={{ marginTop: -6 }}>New people get a mail with a link to set up their profile. To add someone to a production, use the project&apos;s Team tab instead.</p>
          <form action={invite} className="form-grid">
            <div className="field"><label>Email</label><input name="email" type="email" required /></div>
            <div className="field"><label>Role</label>
              <select name="role" defaultValue="crew">{grantable.map((r) => <option key={r} value={r}>{ORG_ROLE_LABEL[r]}</option>)}</select>
            </div>
            <div className="field"><label>Title</label><input name="title" placeholder="Producer, Editor, Press contact" /></div>
            <div className="field"><label>Note in the mail</label><input name="message" maxLength={600} /></div>
            <div className="field wide"><label>Departments</label><div className="row">{DEPARTMENTS.map((d) => <label key={d} className="check small"><input type="checkbox" name="departments" value={d} />{d}</label>)}</div></div>
            <div className="wide"><Submit pendingText="Sending…">Send invite</Submit></div>
          </form>
          <details style={{ marginTop: 12 }}><summary className="small muted">What each role can do</summary>
            <ul className="small">{ORG_ROLES.map((r) => <li key={r}><strong>{ORG_ROLE_LABEL[r]}:</strong> {ORG_ROLE_HINT[r]}</li>)}</ul>
          </details>
        </section>
      ) : null}

      <section className="card" style={{ marginBottom: 20 }}>
        <h2>People</h2>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Person</th><th>Role</th><th>Title & departments</th><th>Status</th><th /></tr></thead>
            <tbody>
              {sorted.map((m) => {
                const p = who.get(m.user_id);
                const fid = `m-${m.user_id}`;
                return (
                  <tr key={m.user_id} style={m.status !== 'active' ? { opacity: 0.55 } : undefined}>
                    <td><div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}><UserAvatar name={p?.display_name || '?'} src={p?.avatar_url} size={28} />
                      <span><strong className="small">{p?.display_name || 'Unnamed'}</strong><br /><small className="muted">{mail.get(m.user_id) ?? ''}</small></span></div></td>
                    {canManage ? (
                      <>
                        <td><select form={fid} name="role" defaultValue={m.role}>{ORG_ROLES.filter((r) => grantable.includes(r) || r === m.role).map((r) => <option key={r} value={r}>{ORG_ROLE_LABEL[r]}</option>)}</select></td>
                        <td><input form={fid} name="title" defaultValue={m.title ?? ''} placeholder="Title" style={{ marginBottom: 4 }} /><input form={fid} name="departments" defaultValue={m.departments.join(', ')} placeholder="camera, drone" /></td>
                        <td><select form={fid} name="status" defaultValue={m.status}><option value="active">Active</option><option value="suspended">Suspended</option><option value="left">Left</option></select></td>
                        <td><form id={fid} action={updateMember}><input type="hidden" name="user_id" value={m.user_id} /><Submit className="btn btn-sm">Save</Submit></form></td>
                      </>
                    ) : (
                      <>
                        <td>{ORG_ROLE_LABEL[m.role]}</td><td><small>{m.title}{m.departments.length ? ` · ${m.departments.join(', ')}` : ''}</small></td><td>{m.status}</td><td><small className="faint">{dateLabel(m.joined_at)}</small></td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {s.can('people.invite') ? (
        <section className="card">
          <h2>Invites</h2>
          {invites.length ? (
            <ul className="list">
              {invites.map((i) => {
                const state = i.accepted_at ? 'accepted' : i.revoked_at ? 'revoked' : Date.parse(i.expires_at) < now ? 'expired' : 'pending';
                return (
                  <li key={i.id}>
                    <span className="grow"><strong className="small">{i.email}</strong>
                      <small>{ORG_ROLE_LABEL[i.org_role as OrgRole]}{i.project ? ` · ${i.project.title}` : ''} · sent {timeAgo(i.created_at)}</small></span>
                    <span className={`badge ${state === 'accepted' ? 'badge-ok' : state === 'pending' ? 'badge-info' : ''}`}>{state}</span>
                    {state === 'pending' ? <form action={revokeInvite}><input type="hidden" name="id" value={i.id} /><ConfirmSubmit>Revoke</ConfirmSubmit></form> : null}
                  </li>
                );
              })}
            </ul>
          ) : <Empty title="No invites yet" />}
          <p className="small muted">Invite links are only shown once, in the mail. If mail isn&apos;t set up, revoke and re-invite once it is.</p>
        </section>
      ) : null}
    </>
  );
}
