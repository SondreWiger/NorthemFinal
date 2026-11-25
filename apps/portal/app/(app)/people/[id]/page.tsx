import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireMember } from '@northem/core/session';
import { supabaseServer } from '@northem/core/supabase/server';
import { KIND_LABEL, STATUS_LABEL } from '@northem/core/format';
import { ORG_ROLE_LABEL, PROJECT_ROLE_LABEL } from '@northem/core/roles';
import type { OrgRole, Profile, Project, ProjectRole } from '@northem/core/types';
import { Poster } from '@northem/ui/poster';
import { Empty, PageHeader, UserAvatar } from '@northem/ui/app';
import { openDm } from '../../chat/actions';

export const metadata: Metadata = { title: 'Person' };

export default async function PersonView(props: PageProps<'/people/[id]'>) {
  const { id } = await props.params;
  const s = await requireMember(`/people/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await supabaseServer();
  const [{ data: prof }, { data: mem }, { data: pm }] = await Promise.all([
    db.from('profiles').select('*').eq('id', id).maybeSingle(),
    db.from('org_members').select('role, title, departments').eq('org_id', s.org.id).eq('user_id', id).maybeSingle(),
    db.from('project_members').select('role, title, project:projects(id, title, kind, status, poster_url)').eq('user_id', id),
  ]);
  if (!prof) notFound();
  const p = prof as Profile;
  const m = mem as { role: OrgRole; title: string | null; departments: string[] } | null;
  const projects = ((pm as unknown as { role: ProjectRole; title: string | null; project: Pick<Project, 'id' | 'title' | 'kind' | 'status' | 'poster_url'> | null }[]) ?? []).filter((x) => x.project);
  return (
    <>
      <PageHeader crumbs={[{ href: '/people', label: 'People' }]}
        title={<span className="row" style={{ gap: 14 }}><UserAvatar name={p.display_name} src={p.avatar_url} size={56} />{p.display_name || 'Unnamed'}</span>}
        sub={[m?.title ?? (m ? ORG_ROLE_LABEL[m.role] : null), p.headline, p.location].filter(Boolean).join(' · ')}
        actions={id !== s.userId ? <form action={openDm}><input type="hidden" name="user_id" value={id} /><button className="btn btn-primary">Message</button></form> : <a className="btn" href="/me">Edit profile</a>} />
      <div className="grid-2">
        <section className="card">
          <h2>About</h2>
          {p.bio ? <p style={{ whiteSpace: 'pre-wrap' }}>{p.bio}</p> : <p className="muted">No bio yet.</p>}
          {m?.departments.length ? <p className="small">{m.departments.map((d) => <span key={d} className="badge" style={{ marginRight: 4 }}>{d}</span>)}</p> : null}
          {p.links?.length ? <ul className="small">{p.links.map((l) => <li key={l.url}><a href={l.url} target="_blank" rel="noreferrer">{l.label || l.url}</a></li>)}</ul> : null}
        </section>
        <section className="card">
          <h2>Projects</h2>
          {projects.length ? (
            <div className="stack">
              {projects.map((x) => (
                <a key={x.project!.id} href={`/projects/${x.project!.id}`} className="proj-card">
                  <Poster title={x.project!.title} seed={x.project!.id} kind={x.project!.kind} src={x.project!.poster_url} />
                  <span style={{ minWidth: 0 }}><strong>{x.project!.title}</strong>
                    <small>{KIND_LABEL[x.project!.kind]} · {STATUS_LABEL[x.project!.status]} · {x.title ?? PROJECT_ROLE_LABEL[x.role]}</small></span>
                </a>
              ))}
            </div>
          ) : <Empty title="No shared projects" />}
        </section>
      </div>
    </>
  );
}
