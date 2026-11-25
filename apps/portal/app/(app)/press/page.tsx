import type { Metadata } from 'next';
import { requireRole } from '@northem/core/session';
import { supabaseServer } from '@northem/core/supabase/server';
import { dateLabel } from '@northem/core/format';
import type { PressKit, PressKitItem } from '@northem/core/types';
import { Empty, PageHeader } from '@northem/ui/app';

export const metadata: Metadata = { title: 'Press room' };

export default async function Press() {
  await requireRole('press', '/press');
  const db = await supabaseServer();
  const { data: kits } = await db.from('press_kits').select('*, project:projects(title), items:press_kit_items(*)').order('created_at', { ascending: false });
  const list = (kits as (PressKit & { project: { title: string } | null; items: PressKitItem[] })[]) ?? [];
  const now = Date.now();
  return (
    <>
      <PageHeader title="Press room" sub="Press kits, stills and notes. Respect the embargo dates." />
      {list.length ? (
        <div className="stack" style={{ gap: 16 }}>
          {list.map((k) => (
            <section key={k.id} className="card">
              <div className="card-head">
                <h2>{k.title}{k.project ? <small className="muted"> · {k.project.title}</small> : null}</h2>
                {k.embargo_until && Date.parse(k.embargo_until) > now ? <span className="badge badge-warn">Embargo until {dateLabel(k.embargo_until)}</span>
                  : <span className="badge badge-ok">{k.audience === 'public' ? 'Public' : 'Press only'}</span>}
              </div>
              {k.summary ? <p>{k.summary}</p> : null}
              <ul className="list">
                {[...k.items].sort((a, b) => a.sort - b.sort).map((it) => (
                  <li key={it.id}>
                    <span className="badge">{it.kind}</span>
                    <span className="grow"><strong className="small">{it.title}</strong>{it.body ? <small style={{ whiteSpace: 'pre-wrap' }}>{it.body}</small> : null}</span>
                    {it.storage_path ? <a className="btn btn-sm" href={`/press-files/${it.id}`}>Download</a> : it.url ? <a className="btn btn-sm" href={it.url} target="_blank" rel="noreferrer">Open</a> : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : <Empty title="No press kits yet" />}
    </>
  );
}
