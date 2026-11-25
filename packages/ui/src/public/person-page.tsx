import type { Division, SiteKey } from '@northem/core/types';
import type { PersonBundle } from '@northem/core/queries';
import { KIND_LABEL } from '@northem/core/format';
import { publicFileUrl } from '@northem/core/queries';
import { Avatar } from './avatar';
import { Gallery } from './interactive';
import { PodcastList } from './project-page';
import { projectHref } from './links';
import { Poster } from '../poster';
import { Topo } from '../micro';

/** A person's page: their work across every division, plus the fun stuff. */
export function PersonPage({ bundle, site, divisions, portalUrl }: { bundle: PersonBundle; site: SiteKey; divisions: Division[]; portalUrl: string }) {
  const { person, credits, tagged, podcasts, trivia } = bundle;
  const byYear = new Map<number | string, typeof credits>();
  for (const c of credits) byYear.set(c.project.year ?? '—', [...(byYear.get(c.project.year ?? '—') ?? []), c]);
  const depts = Array.from(new Set(credits.map((c) => c.job)));
  const urls = Object.fromEntries(tagged.map((m) => [m.id, m.external_url ?? publicFileUrl('public-media', m.storage_path)]));
  const divisionsWorked = Array.from(new Set(credits.map((c) => divisions.find((d) => d.id === c.project.division_id)?.name).filter(Boolean)));
  return (
    <article className="nm-person">
      <header className="nm-person-hero">
        <Topo seed={person.slug} className="nm-person-topo" />
        <Avatar name={person.name} src={person.photo_url} size={132} className="nm-person-photo" />
        <div>
          <span className="nm-kicker">{person.known_for ?? 'Crew'}{person.profile_id ? ' · on the platform' : ''}</span>
          <h1>{person.name}</h1>
          {person.bio ? <p className="nm-logline">{person.bio}</p> : null}
          <ul className="nm-person-stats">
            <li><strong>{credits.length}</strong><span>credits</span></li>
            <li><strong>{new Set(credits.map((c) => c.project_id)).size}</strong><span>projects</span></li>
            {divisionsWorked.length ? <li><strong>{divisionsWorked.length}</strong><span>divisions</span></li> : null}
            {podcasts.length ? <li><strong>{podcasts.length}</strong><span>podcast eps</span></li> : null}
          </ul>
          {person.links?.length ? <p className="nm-links">{person.links.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noreferrer">{l.label} ↗</a>)}</p> : null}
          {!person.profile_id ? <p className="nm-claim">Is this you? <a href={`${portalUrl}/login?claim=${person.slug}`}>Ask us to link your profile</a> and edit it yourself.</p> : null}
        </div>
      </header>

      {depts.length ? <ul className="nm-tags nm-person-jobs">{depts.map((d) => <li key={d}>{d}</li>)}</ul> : null}

      <section className="nm-block nm-filmography">
        <h2>Work</h2>
        {[...byYear.entries()].map(([year, items]) => (
          <div key={String(year)} className="nm-film-year">
            <h3>{year}</h3>
            <ul>
              {items.map((c) => (
                <li key={c.id}>
                  <a href={projectHref(c.project, divisions, site)} className="nm-film">
                    <Poster title={c.project.title} seed={c.project.id} kind={c.project.kind} src={c.project.poster_url} className="nm-film-poster" />
                    <span><strong>{c.project.title}</strong><small>{c.character_name ? `as ${c.character_name}` : c.job} · {KIND_LABEL[c.project.kind]}</small></span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {!credits.length ? <p className="nm-sub">No public credits yet.</p> : null}
      </section>

      {tagged.length ? <section className="nm-block"><h2>Caught on camera</h2><Gallery items={tagged} urls={urls} title={person.name} variant="tape" /></section> : null}
      {trivia.length ? (
        <section className="nm-block nm-said"><h2>Overheard</h2>
          <ul>{trivia.map((t) => <li key={t.id}><blockquote>{t.body}</blockquote>{t.project_title ? <cite>{t.project_title}</cite> : null}</li>)}</ul>
        </section>
      ) : null}
      {podcasts.length ? <section className="nm-block"><h2>On the podcast</h2><PodcastList items={podcasts} /></section> : null}
    </article>
  );
}
