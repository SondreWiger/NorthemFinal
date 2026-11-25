import type { Metadata } from 'next';
import { supabaseServer } from '@northem/core/supabase/server';
import { dateLabel } from '@northem/core/format';
import type { Division, Opening, Project } from '@northem/core/types';
import { ConfirmSubmit, Empty, Notice, PageHeader, Submit } from '@northem/ui/app';
import { requireCan } from '@/guard';
import { deleteOpening, saveOpening } from './actions';

export const metadata: Metadata = { title: 'Jobs & casting' };

const KIND_LABEL: Record<string, string> = { job: 'Job', crew: 'Crew call', casting: 'Casting call', collab: 'Collaboration', internship: 'Internship' };

export default async function Openings(props: PageProps<'/openings'>) {
  const sp = await props.searchParams;
  const s = await requireCan('openings.manage', '/openings');
  const db = await supabaseServer();
  const [{ data: os }, { data: ds }, { data: ps }, { data: subs }] = await Promise.all([
    db.from('openings').select('*').eq('org_id', s.org.id).order('created_at', { ascending: false }),
    db.from('divisions').select('*').eq('org_id', s.org.id).order('sort'),
    db.from('projects').select('id, title').eq('org_id', s.org.id).order('title'),
    s.can('forms.read') ? db.from('submissions').select('opening_id').eq('org_id', s.org.id).not('opening_id', 'is', null) : Promise.resolve({ data: [] }),
  ]);
  const openings = (os as Opening[]) ?? [];
  const divisions = (ds as Division[]) ?? [];
  const projects = (ps as Pick<Project, 'id' | 'title'>[]) ?? [];
  const n = new Map<string, number>();
  for (const x of (subs as { opening_id: string }[]) ?? []) n.set(x.opening_id, (n.get(x.opening_id) ?? 0) + 1);
  const editing = openings.find((o) => o.id === sp.edit);
  const qs = (o?: Opening) => (o?.questions ?? []).map((x) => `${x.label} | ${x.type}${x.required ? ' | required' : ''}`).join('\n');
  return (
    <>
      <PageHeader title="Jobs & casting" sub="Open roles, crew calls and casting calls. Public ones show on the right division site with an application form." />
      {typeof sp.msg === 'string' ? <Notice kind={/saved|deleted/i.test(sp.msg) ? 'ok' : 'bad'}>{sp.msg}</Notice> : null}
      <div className="grid-2" style={{ gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)' }}>
        <section className="card">
          <h2>Openings</h2>
          {openings.length ? (
            <ul className="list">
              {openings.map((o) => (
                <li key={o.id}>
                  <span className="badge">{KIND_LABEL[o.kind]}</span>
                  <a className="grow" href={`/openings?edit=${o.id}`} style={{ textDecoration: 'none' }}>
                    <strong className="small">{o.title}</strong>
                    <small>{divisions.find((d) => d.id === o.division_id)?.name ?? 'All'}{o.closes_at ? ` · closes ${dateLabel(o.closes_at)}` : ''} · {n.get(o.id) ?? 0} applied</small>
                  </a>
                  <span className={`badge ${o.is_open && o.is_public ? 'badge-ok' : ''}`}>{!o.is_open ? 'closed' : o.is_public ? 'public' : 'internal'}</span>
                  {n.get(o.id) ? <a className="btn btn-sm btn-ghost" href={`/inbox?view=all&opening=${o.id}`}>Inbox</a> : null}
                </li>
              ))}
            </ul>
          ) : <Empty title="Nothing open">Post a casting call or a crew call.</Empty>}
        </section>
        <section className="card">
          <div className="card-head"><h2>{editing ? 'Edit opening' : 'New opening'}</h2>{editing ? <a className="small" href="/openings">New instead</a> : null}</div>
          <form action={saveOpening} className="stack" key={editing?.id ?? 'new'}>
            <input type="hidden" name="id" value={editing?.id ?? ''} />
            <div className="row" style={{ gap: 8 }}>
              <div className="field" style={{ flex: 1 }}><label>Kind</label><select name="kind" defaultValue={editing?.kind ?? 'casting'}>{Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div className="field" style={{ flex: 1 }}><label>Division</label><select name="division_id" defaultValue={editing?.division_id ?? ''}><option value="">Main site</option>{divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
            </div>
            <div className="field"><label>Title</label><input name="title" defaultValue={editing?.title} required placeholder="Lead role: Frostline" /></div>
            <div className="field"><label>Project</label><select name="project_id" defaultValue={editing?.project_id ?? ''}><option value="">None</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></div>
            <div className="field"><label>Description</label><textarea name="body" rows={6} defaultValue={editing?.body ?? ''} /></div>
            <div className="row" style={{ gap: 8 }}>
              <div className="field" style={{ flex: 1 }}><label>Location</label><input name="location" defaultValue={editing?.location ?? ''} /></div>
              <div className="field" style={{ flex: 1 }}><label>Closes</label><input name="closes_at" type="date" defaultValue={editing?.closes_at?.slice(0, 10) ?? ''} /></div>
            </div>
            <div className="field"><label>Extra questions</label><textarea name="questions" rows={3} defaultValue={qs(editing)} placeholder={'Showreel link | url | required\nPlaying age | text\nWhy this role? | textarea'} /><small>One per line: question | text, textarea or url | required</small></div>
            <div className="row" style={{ gap: 12 }}>
              <label className="check"><input type="checkbox" name="is_open" defaultChecked={editing?.is_open ?? true} />Open</label>
              <label className="check"><input type="checkbox" name="is_public" defaultChecked={editing?.is_public ?? true} />On the public site</label>
            </div>
            <Submit>{editing ? 'Save' : 'Post opening'}</Submit>
          </form>
          {editing ? <form action={deleteOpening} style={{ marginTop: 10 }}><input type="hidden" name="id" value={editing.id} /><ConfirmSubmit>Delete</ConfirmSubmit></form> : null}
        </section>
      </div>
    </>
  );
}
