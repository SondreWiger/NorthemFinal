import type { Metadata } from 'next';
import { supabaseServer } from '@northem/core/supabase/server';
import { dateLabel, duration } from '@northem/core/format';
import type { Person, PodcastEpisode, Project } from '@northem/core/types';
import { Empty, Notice, PageHeader, Submit } from '@northem/ui/app';
import { Waveform } from '@northem/ui/micro';
import { requireAdmin } from '@/guard';
import { episodeAction, saveEpisode } from './actions';

export const metadata: Metadata = { title: 'Podcasts' };

export default async function Podcasts(props: PageProps<'/podcasts'>) {
  const sp = await props.searchParams;
  const s = await requireAdmin('/podcasts');
  const db = await supabaseServer();
  const [{ data: eps }, { data: ps }, { data: ppl }] = await Promise.all([
    db.from('podcast_episodes').select('*, project:projects(title), guests:podcast_guests(role, person:people(name))').eq('org_id', s.org.id).order('created_at', { ascending: false }),
    db.from('projects').select('id, title').eq('org_id', s.org.id).order('title'),
    db.from('people').select('id, name').eq('org_id', s.org.id).order('name').limit(1000),
  ]);
  const episodes = (eps as (PodcastEpisode & { project: { title: string } | null; guests: { role: string; person: { name: string } | null }[] })[]) ?? [];
  const projects = (ps as Pick<Project, 'id' | 'title'>[]) ?? [];
  const people = (ppl as Pick<Person, 'id' | 'name'>[]) ?? [];
  return (
    <>
      <PageHeader title="Podcasts" sub="Episodes about the work: hosted here, or linked from Spotify, YouTube and friends. Attach them to a project to show them on its page." />
      {typeof sp.msg === 'string' ? <Notice kind={/added|updated|deleted/i.test(sp.msg) ? 'ok' : 'bad'}>{sp.msg}</Notice> : null}
      <div className="grid-2" style={{ gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)' }}>
        <section className="card">
          <h2>Episodes</h2>
          {episodes.length ? (
            <ul className="list">
              {episodes.map((e) => (
                <li key={e.id} style={{ alignItems: 'flex-start' }}>
                  <span className="grow">
                    <strong className="small">{e.episode_number ? `#${e.episode_number} ` : ''}{e.title}</strong>
                    <small>{e.project?.title ?? 'General'} · {e.source}{e.duration_seconds ? ` · ${duration(e.duration_seconds)}` : ''}{e.published_at ? ` · ${dateLabel(e.published_at)}` : ''}</small>
                    {e.guests.length ? <small>{e.guests.map((g) => `${g.person?.name}${g.role === 'host' ? ' (host)' : ''}`).join(', ')}</small> : null}
                  </span>
                  <form action={episodeAction} className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
                    <input type="hidden" name="id" value={e.id} />
                    <button className={`btn btn-sm ${e.is_public ? 'btn-primary' : ''}`} name="op" value={e.is_public ? 'hide' : 'publish'}>{e.is_public ? 'Public' : 'Draft'}</button>
                    <button className="btn btn-sm btn-ghost" name="op" value="delete" aria-label="Delete">✕</button>
                  </form>
                </li>
              ))}
            </ul>
          ) : <Empty title="No episodes yet">Record the director&apos;s commentary, a crew roundtable, or the story of the worst shoot day.</Empty>}
          <div style={{ opacity: 0.5, marginTop: 12 }}><Waveform seed={s.org.id} /></div>
        </section>
        <section className="card">
          <h2>New episode</h2>
          <form action={saveEpisode} className="stack">
            <div className="field"><label>Title</label><input name="title" required /></div>
            <div className="row" style={{ gap: 8 }}>
              <div className="field" style={{ flex: 1 }}><label>Project</label><select name="project_id" defaultValue={typeof sp.project === 'string' ? sp.project : ''}><option value="">General (all of us)</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></div>
              <div className="field" style={{ width: 90 }}><label>Episode</label><input name="episode_number" type="number" min={1} /></div>
            </div>
            <div className="field"><label>Audio or video file</label><input type="file" name="file" accept="audio/*,video/*" /></div>
            <div className="field"><label>…or a link</label><input name="external_url" placeholder="https://open.spotify.com/episode/…" /></div>
            <div className="field"><label>Length (minutes)</label><input name="minutes" type="number" step="0.5" /></div>
            <div className="field"><label>Description</label><textarea name="description" rows={3} /></div>
            <div className="field"><label>Hosts</label><select name="hosts" multiple size={4}>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div className="field"><label>Guests</label><select name="guests" multiple size={4}>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><small>Hold Ctrl / ⌘ to pick several.</small></div>
            <label className="check"><input type="checkbox" name="is_public" />Publish now</label>
            <Submit pendingText="Uploading…">Add episode</Submit>
          </form>
        </section>
      </div>
    </>
  );
}
