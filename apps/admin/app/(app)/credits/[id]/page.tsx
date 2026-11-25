import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabaseServer } from '@northem/core/supabase/server';
import { siteUrl } from '@northem/core/env';
import type { FilmographyItem, Person, Profile } from '@northem/core/types';
import { Avatar } from '@northem/ui/public';
import { ConfirmSubmit, Empty, Notice, PageHeader, Submit } from '@northem/ui/app';
import { requireAdmin } from '@/guard';
import { deletePerson, savePerson } from '../actions';

export const metadata: Metadata = { title: 'Person' };

export default async function PersonAdmin(props: PageProps<'/credits/[id]'>) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const s = await requireAdmin(`/credits/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await supabaseServer();
  const [{ data }, { data: cr }, { data: mem }] = await Promise.all([
    db.from('people').select('*').eq('id', id).maybeSingle(),
    db.from('credits').select('*, project:projects(id, slug, title, year, kind, poster_url, division_id, status)').eq('person_id', id),
    db.from('org_members').select('user_id').eq('org_id', s.org.id),
  ]);
  if (!data) notFound();
  const p = data as Person;
  const credits = ((cr as FilmographyItem[]) ?? []).filter((c) => c.project).sort((a, b) => (b.project.year ?? 0) - (a.project.year ?? 0));
  const ids = ((mem as { user_id: string }[]) ?? []).map((m) => m.user_id);
  const { data: profs } = ids.length ? await db.from('profiles').select('id, display_name').in('id', ids) : { data: [] };
  const members = ((profs as Pick<Profile, 'id' | 'display_name'>[]) ?? []).sort((a, b) => a.display_name.localeCompare(b.display_name));
  const links = [...(p.links ?? []), { label: '', url: '' }, { label: '', url: '' }];
  return (
    <>
      <PageHeader crumbs={[{ href: '/credits', label: 'Credits & people' }]} title={<span className="row" style={{ gap: 12 }}><Avatar name={p.name} src={p.photo_url} size={48} />{p.name}</span>}
        sub={p.known_for ?? undefined} actions={p.is_public ? <a className="btn btn-sm" href={siteUrl('landing', `/people/${p.slug}`)} target="_blank" rel="noreferrer">Public page ↗</a> : null} />
      {typeof sp.msg === 'string' ? <Notice kind={/saved|added/i.test(sp.msg) ? 'ok' : 'bad'}>{sp.msg}</Notice> : null}
      <div className="grid-2">
        <section className="card">
          <form action={savePerson} className="stack">
            <input type="hidden" name="id" value={p.id} />
            <div className="field"><label>Name</label><input name="name" defaultValue={p.name} required /></div>
            <div className="field"><label>Web address</label><input name="slug" defaultValue={p.slug} /></div>
            <div className="field"><label>Known for</label><input name="known_for" defaultValue={p.known_for ?? ''} /></div>
            <div className="field"><label>Photo</label><input type="file" name="photo" accept="image/*" /></div>
            <div className="field"><label>Bio</label><textarea name="bio" rows={5} defaultValue={p.bio ?? ''} /></div>
            <div className="field"><label>Links</label>{links.map((l, i) => (
              <div key={i} className="row" style={{ gap: 6, marginBottom: 6 }}><input name="link_label" defaultValue={l.label} placeholder="IMDb" style={{ width: 110 }} /><input name="link_url" defaultValue={l.url} placeholder="https://" style={{ flex: 1 }} /></div>
            ))}</div>
            <div className="field"><label>Team account</label>
              <select name="profile_id" defaultValue={p.profile_id ?? ''}><option value="">Not linked</option>{members.map((m) => <option key={m.id} value={m.id}>{m.display_name || 'Unnamed'}</option>)}</select>
              <small>Linked people can edit their own page from the portal and get notified about credits.</small>
            </div>
            <label className="check"><input type="checkbox" name="is_public" defaultChecked={p.is_public} />Public page</label>
            <Submit>Save</Submit>
          </form>
        </section>
        <div className="stack" style={{ gap: 16 }}>
          <section className="card">
            <h2>Credits ({credits.length})</h2>
            {credits.length ? (
              <ul className="list">{credits.map((c) => (
                <li key={c.id}><a className="grow" href={`/projects/${c.project.id}?tab=credits`} style={{ textDecoration: 'none' }}><strong className="small">{c.project.title}{c.project.year ? ` (${c.project.year})` : ''}</strong><small>{c.job}{c.character_name ? ` as ${c.character_name}` : ''}</small></a>{!c.is_public ? <span className="badge">hidden</span> : null}</li>
              ))}</ul>
            ) : <Empty title="No credits yet">Credit them from a project&apos;s Credits tab.</Empty>}
          </section>
          <section className="card">
            <h2>Delete</h2>
            <p className="small muted">Removes the page and all their credits.</p>
            <form action={deletePerson}><input type="hidden" name="id" value={p.id} /><ConfirmSubmit>Delete person</ConfirmSubmit></form>
          </section>
        </div>
      </div>
    </>
  );
}
