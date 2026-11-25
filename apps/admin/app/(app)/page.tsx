import { supabaseServer } from '@northem/core/supabase/server';
import { FORM_LABEL, KIND_LABEL, STATUS_LABEL, timeAgo } from '@northem/core/format';
import type { Project, Submission } from '@northem/core/types';
import { Empty, PageHeader } from '@northem/ui/app';
import { Telemetry } from '@northem/ui/micro';
import { requireAdmin } from '@/guard';

export default async function Overview() {
  const s = await requireAdmin('/');
  const db = await supabaseServer();
  const [subs, projects, members, invites] = await Promise.all([
    s.can('forms.read') ? db.from('submissions').select('*').eq('org_id', s.org.id).order('created_at', { ascending: false }).limit(8) : Promise.resolve({ data: [] }),
    db.from('projects').select('*').eq('org_id', s.org.id).order('updated_at', { ascending: false }).limit(8),
    db.from('org_members').select('user_id', { count: 'exact', head: true }).eq('org_id', s.org.id).eq('status', 'active'),
    s.can('people.invite') ? db.from('invites').select('id', { count: 'exact', head: true }).eq('org_id', s.org.id).is('accepted_at', null).is('revoked_at', null).gt('expires_at', new Date().toISOString()) : Promise.resolve({ count: 0 }),
  ]);
  const inbox = (subs.data as Submission[]) ?? [];
  const proj = (projects.data as Project[]) ?? [];
  const fresh = inbox.filter((x) => x.status === 'new').length;
  return (
    <>
      <PageHeader title="Control room" sub={`Everything ${s.org.name} shows the world, and who gets to see what inside.`}
        actions={s.can('projects.create') ? <a className="btn btn-primary" href="/projects/new">New project</a> : null} />
      <div className="grid-3" style={{ marginBottom: 20 }}>
        <a className="card stat" href="/inbox" style={{ textDecoration: 'none' }}><strong>{fresh}</strong><span>new in the inbox</span></a>
        <a className="card stat" href="/projects" style={{ textDecoration: 'none' }}><strong>{proj.length}</strong><span>recent projects</span></a>
        <a className="card stat" href="/team" style={{ textDecoration: 'none' }}><strong>{members.count ?? 0}</strong><span>on the team · {'count' in invites ? invites.count ?? 0 : 0} invites out</span></a>
      </div>
      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2>Inbox</h2><a className="small muted" href="/inbox">Open →</a></div>
          {inbox.length ? (
            <ul className="list">
              {inbox.map((x) => (
                <li key={x.id}>
                  {x.status === 'new' ? <span className="dot" aria-label="New" /> : null}
                  <a className="grow" href={`/inbox/${x.id}`} style={{ textDecoration: 'none' }}>
                    <strong className="small">{x.name || x.email} <span className="faint">· {FORM_LABEL[x.form] ?? x.form}</span></strong>
                    <small style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.subject || x.message}</small>
                  </a>
                  <small className="faint">{timeAgo(x.created_at)}</small>
                </li>
              ))}
            </ul>
          ) : <Empty title={s.can('forms.read') ? 'Inbox zero' : 'No inbox access'}>{s.can('forms.read') ? 'Pitches, applications and messages land here.' : null}</Empty>}
        </section>
        <section className="card">
          <div className="card-head"><h2>Projects</h2><a className="small muted" href="/projects">All →</a></div>
          {proj.length ? (
            <ul className="list">
              {proj.map((p) => (
                <li key={p.id}>
                  <a className="grow" href={`/projects/${p.id}`} style={{ textDecoration: 'none' }}>
                    <strong className="small">{p.title}</strong>
                    <small>{KIND_LABEL[p.kind]} · {STATUS_LABEL[p.status]} · {p.visibility === 'public' && p.published_at ? 'live' : p.visibility}</small>
                  </a>
                  <small className="faint">{timeAgo(p.updated_at)}</small>
                </li>
              ))}
            </ul>
          ) : <Empty title="No projects yet" />}
          <div style={{ marginTop: 12, opacity: 0.6 }}><Telemetry label="CONTROL" /></div>
        </section>
      </div>
    </>
  );
}
