import type { Metadata } from 'next';
import { supabaseServer } from '@northem/core/supabase/server';
import { env } from '@northem/core/env';
import { dateLabel } from '@northem/core/format';
import type { PressKit, PressKitItem, Project } from '@northem/core/types';
import { ConfirmSubmit, Empty, Notice, PageHeader, Submit } from '@northem/ui/app';
import { requireCan } from '@/guard';
import { addItem, createKit, removeItem, updateKit } from './actions';

export const metadata: Metadata = { title: 'Press kits' };

export default async function Press(props: PageProps<'/press'>) {
  const sp = await props.searchParams;
  const s = await requireCan('sites.edit', '/press');
  const db = await supabaseServer();
  const [{ data: ks }, { data: ps }] = await Promise.all([
    db.from('press_kits').select('*, project:projects(title), items:press_kit_items(*)').eq('org_id', s.org.id).order('created_at', { ascending: false }),
    db.from('projects').select('id, title').eq('org_id', s.org.id).order('title'),
  ]);
  const kits = (ks as (PressKit & { project: { title: string } | null; items: PressKitItem[] })[]) ?? [];
  const projects = (ps as Pick<Project, 'id' | 'title'>[]) ?? [];
  const open = kits.find((k) => k.id === sp.kit);
  return (
    <>
      <PageHeader title="Press kits" sub={<>Stills, posters, one-sheets and notes for journalists. Press-role members see them in the <a href={`${env.portalUrl}/press`}>portal press room</a>; public kits also show on the site&apos;s press page.</>} />
      {typeof sp.msg === 'string' ? <Notice kind={/created|saved|added|removed|deleted/i.test(sp.msg) ? 'ok' : 'bad'}>{sp.msg}</Notice> : null}
      <div className="grid-2" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.3fr)' }}>
        <div className="stack" style={{ gap: 16 }}>
          <section className="card">
            <h2>Kits</h2>
            {kits.length ? (
              <ul className="list">{kits.map((k) => (
                <li key={k.id}>
                  <a className="grow" href={`/press?kit=${k.id}`} style={{ textDecoration: 'none', fontWeight: open?.id === k.id ? 700 : undefined }}>
                    <strong className="small">{k.title}</strong><small>{k.project?.title ?? 'Company'} · {k.items.length} item{k.items.length === 1 ? '' : 's'}</small>
                  </a>
                  <span className={`badge ${k.audience === 'public' ? 'badge-ok' : 'badge-info'}`}>{k.audience}</span>
                </li>
              ))}</ul>
            ) : <Empty title="No kits yet" />}
          </section>
          <section className="card">
            <h2>New kit</h2>
            <form action={createKit} className="stack">
              <div className="field"><label>Title</label><input name="title" required placeholder="Frostline press kit" /></div>
              <div className="field"><label>Project</label><select name="project_id" defaultValue=""><option value="">Company-wide</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></div>
              <div className="field"><label>Summary</label><textarea name="summary" rows={3} /></div>
              <div className="row" style={{ gap: 8 }}>
                <div className="field" style={{ flex: 1 }}><label>Who</label><select name="audience" defaultValue="press"><option value="press">Press role only</option><option value="public">Anyone</option></select></div>
                <div className="field" style={{ flex: 1 }}><label>Embargo until</label><input name="embargo_until" type="datetime-local" /></div>
              </div>
              <Submit>Create kit</Submit>
            </form>
          </section>
        </div>
        {open ? (
          <section className="card">
            <form action={updateKit} className="stack">
              <input type="hidden" name="id" value={open.id} />
              <div className="field"><label>Title</label><input name="title" defaultValue={open.title} /></div>
              <div className="field"><label>Summary</label><textarea name="summary" rows={3} defaultValue={open.summary ?? ''} /></div>
              <div className="row" style={{ gap: 8 }}>
                <div className="field" style={{ flex: 1 }}><label>Who</label><select name="audience" defaultValue={open.audience}><option value="press">Press role only</option><option value="public">Anyone</option></select></div>
                <div className="field" style={{ flex: 1 }}><label>Embargo until</label><input name="embargo_until" type="datetime-local" defaultValue={open.embargo_until?.slice(0, 16) ?? ''} /></div>
              </div>
              <Submit>Save</Submit>
            </form>
            <form action={updateKit} style={{ marginTop: 8 }}><input type="hidden" name="id" value={open.id} /><input type="hidden" name="delete" value="1" /><ConfirmSubmit>Delete kit</ConfirmSubmit></form>
            <h3 style={{ marginTop: 20 }}>Contents</h3>
            {open.items.length ? (
              <ul className="list">{[...open.items].sort((a, b) => a.sort - b.sort).map((it) => (
                <li key={it.id}>
                  <span className="badge">{it.kind}</span>
                  <span className="grow small">{it.title}</span>
                  <form action={removeItem}><input type="hidden" name="kit_id" value={open.id} /><input type="hidden" name="id" value={it.id} /><button className="btn btn-sm btn-ghost" aria-label="Remove">✕</button></form>
                </li>
              ))}</ul>
            ) : <p className="muted small">Empty so far.</p>}
            {open.embargo_until ? <p className="small muted">Embargoed until {dateLabel(open.embargo_until)}.</p> : null}
            <form action={addItem} className="stack" style={{ marginTop: 12 }}>
              <input type="hidden" name="kit_id" value={open.id} />
              <div className="field"><label>Files</label><input type="file" name="files" multiple /></div>
              <div className="field"><label>…or a link</label><input name="url" placeholder="https://vimeo.com/… (trailer, EPK)" /></div>
              <div className="field"><label>…or text</label><textarea name="body" rows={3} placeholder="Director's statement, fact sheet, quotes" /></div>
              <div className="field"><label>Title</label><input name="title" placeholder="Used for links, text and single files" /></div>
              <Submit pendingText="Uploading…">Add to kit</Submit>
            </form>
          </section>
        ) : <section className="card"><Empty title="Pick a kit">Or create one on the left.</Empty></section>}
      </div>
    </>
  );
}
