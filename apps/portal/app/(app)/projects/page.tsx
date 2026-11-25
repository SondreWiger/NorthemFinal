import type { Metadata } from 'next';
import { requireMember } from '@northem/core/session';
import { env } from '@northem/core/env';
import { KIND_LABEL, STATUS_LABEL } from '@northem/core/format';
import { PROJECT_ROLE_LABEL } from '@northem/core/roles';
import { Poster } from '@northem/ui/poster';
import { Empty, PageHeader } from '@northem/ui/app';
import { myProjects } from '@/data';

export const metadata: Metadata = { title: 'Projects' };

export default async function Projects(props: PageProps<'/projects'>) {
  const s = await requireMember('/projects');
  const sp = await props.searchParams;
  const q = typeof sp.q === 'string' ? sp.q.toLowerCase() : '';
  const show = sp.show === 'all' ? 'all' : 'mine';
  const { all, mine, roles } = await myProjects(s.org.id, s.userId);
  const list = (show === 'all' ? all : mine).filter((p) => !q || `${p.title} ${p.logline ?? ''}`.toLowerCase().includes(q));
  return (
    <>
      <PageHeader title="Projects" sub="Everything you're on, and everything open to the team."
        actions={s.can('projects.create') ? <a className="btn btn-primary" href={`${env.adminUrl}/projects/new`}>New project</a> : null} />
      <form className="row" style={{ marginBottom: 16 }}>
        <input className="input" name="q" defaultValue={q} placeholder="Search projects" style={{ maxWidth: 320 }} />
        <select className="input" name="show" defaultValue={show} style={{ width: 'auto' }}>
          <option value="mine">My projects ({mine.length})</option>
          <option value="all">All I can see ({all.length})</option>
        </select>
        <button className="btn">Filter</button>
      </form>
      {list.length ? (
        <div className="grid-auto">
          {list.map((p) => {
            const r = roles.get(p.id);
            return (
              <a key={p.id} href={`/projects/${p.id}`} className="proj-card">
                <Poster title={p.title} seed={p.id} kind={p.kind} src={p.poster_url} />
                <span style={{ minWidth: 0 }}>
                  <strong>{p.title}</strong>
                  <small>{KIND_LABEL[p.kind]} · {STATUS_LABEL[p.status]}</small>
                  <span className="row" style={{ marginTop: 6, gap: 6 }}>
                    {r ? <span className="badge badge-accent">{PROJECT_ROLE_LABEL[r.role]}</span> : <span className="badge">Viewer</span>}
                    {p.visibility === 'public' && p.published_at ? <span className="badge badge-ok">Public</span> : null}
                  </span>
                </span>
              </a>
            );
          })}
        </div>
      ) : <Empty title={q ? 'No matches' : show === 'mine' ? "You're not on a project yet" : 'No projects yet'}>{show === 'mine' ? <> <a href="?show=all">See all projects</a>.</> : null}</Empty>}
    </>
  );
}
