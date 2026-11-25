import type { Metadata } from 'next';
import { supabaseServer } from '@northem/core/supabase/server';
import type { Person } from '@northem/core/types';
import { Empty, Notice, PageHeader, Submit } from '@northem/ui/app';
import { Avatar } from '@northem/ui/public';
import { requireAdmin } from '@/guard';
import { createPerson } from './actions';

export const metadata: Metadata = { title: 'Credits & people pages' };

export default async function People(props: PageProps<'/credits'>) {
  const sp = await props.searchParams;
  const s = await requireAdmin('/credits');
  const search = typeof sp.q === 'string' ? sp.q.trim().toLowerCase() : '';
  const db = await supabaseServer();
  const [{ data }, { data: counts }] = await Promise.all([
    db.from('people').select('*').eq('org_id', s.org.id).order('name').limit(2000),
    db.from('credits').select('person_id'),
  ]);
  const n = new Map<string, number>();
  for (const c of (counts as { person_id: string }[]) ?? []) n.set(c.person_id, (n.get(c.person_id) ?? 0) + 1);
  const people = ((data as Person[]) ?? []).filter((p) => !search || `${p.name} ${p.known_for}`.toLowerCase().includes(search));
  return (
    <>
      <PageHeader title="Credits & people pages" sub="Everyone who can be credited, with or without an account. Each one gets an IMDb-style page with everything they've worked on." />
      {typeof sp.msg === 'string' ? <Notice kind="ok">{sp.msg}</Notice> : null}
      <div className="grid-2" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)' }}>
        <section className="card">
          <form className="row" style={{ gap: 8, marginBottom: 12 }}><input className="input" name="q" defaultValue={search} placeholder="Search" style={{ flex: 1 }} /><button className="btn">Search</button></form>
          {people.length ? (
            <ul className="list">
              {people.map((p) => (
                <li key={p.id}>
                  <Avatar name={p.name} src={p.photo_url} size={34} />
                  <a className="grow" href={`/credits/${p.id}`} style={{ textDecoration: 'none' }}><strong className="small">{p.name}</strong><small>{p.known_for ?? '—'} · {n.get(p.id) ?? 0} credit{n.get(p.id) === 1 ? '' : 's'}</small></a>
                  {p.profile_id ? <span className="badge badge-info">has account</span> : null}
                  {!p.is_public ? <span className="badge">hidden</span> : null}
                </li>
              ))}
            </ul>
          ) : <Empty title="Nobody yet">Add someone, or credit a team member on a project.</Empty>}
        </section>
        <section className="card">
          <h2>Add a person</h2>
          <form action={createPerson} className="stack">
            <div className="field"><label>Name</label><input name="name" required /></div>
            <div className="field"><label>Known for</label><input name="known_for" placeholder="Cinematographer" /></div>
            <div className="field"><label>Web address</label><input name="slug" placeholder="made from the name" /></div>
            <Submit>Add</Submit>
          </form>
        </section>
      </div>
    </>
  );
}
