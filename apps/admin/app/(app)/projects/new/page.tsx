import type { Metadata } from 'next';
import { supabaseServer } from '@northem/core/supabase/server';
import { KIND_LABEL, STATUS_LABEL } from '@northem/core/format';
import { sps, IntegrationError } from '@northem/core/integrations';
import { PROJECT_KINDS, PROJECT_STATUSES, type Division } from '@northem/core/types';
import { Notice, PageHeader, Submit } from '@northem/ui/app';
import { requireCan } from '@/guard';
import { createProject } from '../actions';

export const metadata: Metadata = { title: 'New project' };

export default async function NewProject(props: PageProps<'/projects/new'>) {
  const sp = await props.searchParams;
  const s = await requireCan('projects.create', '/projects/new');
  const db = await supabaseServer();
  const { data: ds } = await db.from('divisions').select('*').eq('org_id', s.org.id).order('sort');
  const divisions = (ds as Division[]) ?? [];
  let spsProjects: { id: string; title: string }[] | null = null;
  let spsError: string | null = null;
  try { spsProjects = await sps.projects(s.userId); } catch (e) { spsError = e instanceof IntegrationError ? e.message : 'Screenplay Studio did not answer.'; }
  return (
    <>
      <PageHeader title="New project" crumbs={[{ href: '/projects', label: 'Projects' }]} sub="You become its lead. A project chat channel is made for it automatically." />
      {typeof sp.msg === 'string' ? <Notice kind="bad">{sp.msg}</Notice> : null}
      <section className="card">
        <form action={createProject} className="form-grid">
          <div className="field wide"><label>Title</label><input name="title" required maxLength={200} placeholder="Frostline" /></div>
          <div className="field"><label>Division</label>
            <select name="division_id" defaultValue={divisions[0]?.id ?? ''}><option value="">None</option>{divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
            <small>Decides which site the public page lives on.</small>
          </div>
          <div className="field"><label>Web address</label><input name="slug" placeholder="frostline (made from the title if empty)" maxLength={80} /></div>
          <div className="field"><label>Kind</label><select name="kind" defaultValue="short">{PROJECT_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select></div>
          <div className="field"><label>Status</label><select name="status" defaultValue="development">{PROJECT_STATUSES.map((k) => <option key={k} value={k}>{STATUS_LABEL[k]}</option>)}</select></div>
          <div className="field"><label>Year</label><input name="year" type="number" min={1900} max={2100} defaultValue={new Date().getFullYear()} /></div>
          <div className="field wide"><label>Logline</label><input name="logline" maxLength={300} placeholder="One sentence that makes people want to see it." /></div>
          <div className="field wide"><label>Screenplay Studio project</label>
            {spsProjects?.length ? (
              <select name="sps_project" defaultValue=""><option value="">Don&apos;t link now</option>{spsProjects.map((p) => <option key={p.id} value={`${p.id}|${p.title}`}>{p.title}</option>)}</select>
            ) : (
              <input name="sps_project" placeholder="Paste the Screenplay Studio project id (optional)" />
            )}
            <small>{spsError ?? (spsProjects === null ? 'Connect Screenplay Studio in your portal profile to pick from a list.' : 'Scripts from it show up on the project for everyone allowed to see them.')}</small>
          </div>
          <div className="wide"><Submit pendingText="Creating…">Create project</Submit></div>
        </form>
      </section>
    </>
  );
}
