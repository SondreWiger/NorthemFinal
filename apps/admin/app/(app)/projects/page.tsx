import type { Metadata } from 'next';
import { supabaseServer } from '@northem/core/supabase/server';
import { KIND_LABEL, STATUS_LABEL, timeAgo } from '@northem/core/format';
import type { Division, Project } from '@northem/core/types';
import { Poster } from '@northem/ui/poster';
import { Empty, Notice, PageHeader } from '@northem/ui/app';
import { requireAdmin } from '@/guard';

export const metadata: Metadata = { title: 'Projects' };

export default async function Projects(props: PageProps<'/projects'>) {
  const sp = await props.searchParams;
  const s = await requireAdmin('/projects');
  const div = typeof sp.division === 'string' ? sp.division : '';
  const db = await supabaseServer();
  const [{ data: ps }, { data: ds }] = await Promise.all([
    db.from('projects').select('*').eq('org_id', s.org.id).order('updated_at', { ascending: false }).limit(300),
    db.from('divisions').select('*').eq('org_id', s.org.id).order('sort'),
  ]);
  const divisions = (ds as Division[]) ?? [];
  const projects = ((ps as Project[]) ?? []).filter((p) => !div || p.division_id === div);
  const live = (p: Project) => (p.visibility === 'public' || p.visibility === 'unlisted') && p.published_at;
  return (
    <>
      <PageHeader title="Projects" sub="Every production and build, its team, its public page and where it lives."
        actions={s.can('projects.create') ? <a className="btn btn-primary" href="/projects/new">New project</a> : null} />
      {typeof sp.msg === 'string' ? <Notice kind="ok">{sp.msg}</Notice> : null}
      <nav className="tabs">
        <a href="/projects" aria-current={!div ? 'page' : undefined}>All</a>
        {divisions.map((d) => <a key={d.id} href={`/projects?division=${d.id}`} aria-current={div === d.id ? 'page' : undefined}>{d.name}</a>)}
      </nav>
      {projects.length ? (
        <div className="grid-auto">
          {projects.map((p) => (
            <a key={p.id} href={`/projects/${p.id}`} className="proj-card card" style={{ textDecoration: 'none' }}>
              <Poster title={p.title} seed={p.id} kind={p.kind} src={p.poster_url} />
              <span style={{ minWidth: 0 }}>
                <strong>{p.title}</strong>
                <small>{KIND_LABEL[p.kind]} · {STATUS_LABEL[p.status]}</small>
                <small>{divisions.find((d) => d.id === p.division_id)?.name ?? 'No division'} · {timeAgo(p.updated_at)}</small>
                <span className={`badge ${live(p) ? 'badge-ok' : ''}`} style={{ marginTop: 4 }}>{live(p) ? 'Live' : p.visibility}</span>
              </span>
            </a>
          ))}
        </div>
      ) : <Empty title="No projects here yet" />}
    </>
  );
}
