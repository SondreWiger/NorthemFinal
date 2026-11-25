import type { Division, PageBlock, PodcastEpisode, ProjectBundle, SiteKey } from '@northem/core/types';
import { KIND_LABEL, STATUS_LABEL, dateLabel, duration, embedUrl } from '@northem/core/format';
import { publicFileUrl } from '@northem/core/queries';
import { DEPARTMENTS, deptLabel } from '@northem/core/roles';
import { Poster } from '../poster';
import { Grain, Waveform, CropMarks } from '../micro';
import { DEFAULT_BLOCKS, SITE_THEMES, scopeCss, themeData, themeStyle } from '../theme';
import { Avatar } from './avatar';
import { Gallery, TriviaDeck } from './interactive';
import { personHref } from './links';

const DEPT_ORDER: string[] = ['directing', 'writing', 'producing', 'cast', ...DEPARTMENTS];
const DEPT_LABEL: Record<string, string> = { directing: 'Directed by', writing: 'Written by', producing: 'Produced by', cast: 'Cast', camera: 'Camera', drone: 'Aerial', sound: 'Sound', post: 'Post-production', engineering: 'Engineering', design: 'Design' };

/** A public project page: IMDb's skeleton, but showing the real side of the work. */
export function ProjectPage({ bundle, site, divisions }: { bundle: ProjectBundle; site: SiteKey; divisions: Division[] }) {
  const { project: p, theme, credits, media, trivia, moments, podcasts } = bundle;
  const tokens = { ...(theme?.tokens ?? {}), ...(p.theme_overrides ?? {}) };
  const style = themeStyle(SITE_THEMES[site], theme?.tokens, p.theme_overrides);
  const blocks: PageBlock[] = p.page_blocks?.length ? p.page_blocks : theme?.layout?.blocks?.length ? theme.layout.blocks : DEFAULT_BLOCKS;
  const scope = `.nm-project-${p.id.replace(/[^a-z0-9]/gi, '')}`;
  const urls = Object.fromEntries(media.map((m) => [m.id, m.external_url ?? publicFileUrl('public-media', m.storage_path)]));
  const people = Object.fromEntries(credits.map((c) => [c.person_id, { name: c.person.name, href: personHref(c.person.slug) }]));
  const division = divisions.find((d) => d.id === p.division_id);
  const director = credits.find((c) => c.department === 'directing');

  return (
    <article className={`nm-project ${scope.slice(1)}`} style={style} {...themeData(tokens)}>
      {theme?.custom_css ? <style>{scopeCss(theme.custom_css, scope)}</style> : null}
      <header className="nm-project-hero">
        <Grain opacity={0.07} />
        <div className="nm-project-hero-art" aria-hidden>
          <Poster title={p.title} seed={p.id} kind={p.kind} src={p.cover_url ?? p.poster_url} hint={`${p.locations.join(' ')} ${tokens.texture ?? ''}`} />
        </div>
        <div className="nm-project-hero-inner">
          <div className="nm-project-poster">
            <Poster title={p.title} seed={p.id} kind={p.kind} src={p.poster_url} year={p.year} hint={`${p.locations.join(' ')} ${tokens.texture ?? ''}`} />
            <CropMarks />
          </div>
          <div className="nm-project-head">
            <span className="nm-kicker">{division?.name ?? 'Northem'} · {KIND_LABEL[p.kind]}</span>
            <h1>{p.title}</h1>
            {p.logline ? <p className="nm-logline">{p.logline}</p> : null}
            <dl className="nm-facts">
              {p.year ? <div><dt>Year</dt><dd>{p.year}</dd></div> : null}
              <div><dt>Status</dt><dd>{STATUS_LABEL[p.status]}</dd></div>
              {p.runtime_minutes ? <div><dt>Runtime</dt><dd>{p.runtime_minutes} min</dd></div> : null}
              {p.locations.length ? <div><dt>Shot in</dt><dd>{p.locations.join(', ')}</dd></div> : null}
              {director ? <div><dt>Director</dt><dd><a href={personHref(director.person.slug)}>{director.person.name}</a></dd></div> : null}
              {p.client ? <div><dt>For</dt><dd>{p.client}</dd></div> : null}
            </dl>
            {p.genres.length ? <ul className="nm-tags">{p.genres.map((g) => <li key={g}>{g}</li>)}</ul> : null}
            <nav className="nm-jump" aria-label="On this page">
              {blocks.map((b, i) => <a key={i} href={`#b-${i}`}>{blockTitle(b)}</a>)}
            </nav>
          </div>
        </div>
      </header>

      {p.trailer_url && embedUrl(p.trailer_url) ? (
        <section className="nm-block nm-trailer"><div className="nm-embed"><iframe src={embedUrl(p.trailer_url)!} title={`${p.title} trailer`} allow="fullscreen; picture-in-picture" allowFullScreen loading="lazy" /></div></section>
      ) : null}

      {blocks.map((b, i) => {
        const id = `b-${i}`;
        switch (b.type) {
          case 'synopsis':
            return p.synopsis ? <section key={id} id={id} className="nm-block nm-synopsis"><h2>The story</h2><p>{p.synopsis}</p></section> : null;
          case 'stats': {
            const entries = Object.entries(p.stats ?? {});
            return entries.length ? (
              <section key={id} id={id} className="nm-block nm-stats"><h2>{b.title ?? 'By the numbers'}</h2>
                <ul>{entries.map(([k, v]) => <li key={k}><strong>{v}</strong><span>{k}</span></li>)}</ul>
              </section>
            ) : null;
          }
          case 'credits': {
            if (!credits.length) return null;
            const groups = new Map<string, typeof credits>();
            for (const c of credits) groups.set(c.department, [...(groups.get(c.department) ?? []), c]);
            const order = [...groups.keys()].sort((a, b2) => (DEPT_ORDER.indexOf(a) + 99) % 99 - (DEPT_ORDER.indexOf(b2) + 99) % 99);
            return (
              <section key={id} id={id} className="nm-block nm-credits"><h2>{b.title ?? 'Who made it'}</h2>
                {order.map((dept) => (
                  <div key={dept} className="nm-credit-group">
                    <h3>{DEPT_LABEL[dept] ?? deptLabel(dept)}</h3>
                    <ul>
                      {groups.get(dept)!.map((c) => (
                        <li key={c.id}>
                          <a href={personHref(c.person.slug)} className="nm-credit">
                            <Avatar name={c.person.name} src={c.person.photo_url} size={44} />
                            <span><strong>{c.person.name}</strong><small>{c.character_name && dept === 'cast' ? c.character_name : c.job}{c.note ? ` · ${c.note}` : ''}</small></span>
                            {c.person.profile_id ? <i className="nm-verified" title="On the platform">●</i> : null}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>
            );
          }
          case 'gallery': {
            const items = media.filter((m) => (b.kinds?.length ? b.kinds.includes(m.kind) : m.kind !== 'blooper' && m.kind !== 'audio'));
            return items.length ? <section key={id} id={id} className="nm-block nm-photos"><h2>{b.title ?? 'From the shoot'}</h2><Gallery items={items} urls={urls} title={p.title} /></section> : null;
          }
          case 'bloopers': {
            const items = media.filter((m) => m.kind === 'blooper');
            return items.length ? <section key={id} id={id} className="nm-block nm-bloopers"><h2>{b.title ?? 'Bloopers'}</h2><p className="nm-sub">The takes that didn&apos;t make it. Thankfully.</p><Gallery items={items} urls={urls} title={p.title} variant="tape" /></section> : null;
          }
          case 'trivia':
            return trivia.length ? <section key={id} id={id} className="nm-block nm-trivia"><h2>{b.title ?? 'Did you know'}</h2><TriviaDeck items={trivia} people={people} /></section> : null;
          case 'diary':
            return moments.length ? (
              <section key={id} id={id} className="nm-block nm-diary"><h2>{b.title ?? 'Production diary'}</h2>
                <ol>{moments.map((m) => (
                  <li key={m.id}>
                    <time dateTime={m.happened_on}>{dateLabel(m.happened_on, { day: 'numeric', month: 'short' })}</time>
                    <div><strong>{m.mood ? <span aria-hidden>{m.mood} </span> : null}{m.title}</strong>{m.body ? <p>{m.body}</p> : null}</div>
                  </li>
                ))}</ol>
              </section>
            ) : null;
          case 'podcasts':
            return podcasts.length ? <section key={id} id={id} className="nm-block nm-podcasts"><h2>{b.title ?? 'We talked about it'}</h2><PodcastList items={podcasts} /></section> : null;
          case 'text':
            return <section key={id} id={id} className="nm-block nm-text">{b.title ? <h2>{b.title}</h2> : null}{b.body.split(/\n{2,}/).map((para, k) => <p key={k}>{para}</p>)}</section>;
          case 'quote':
            return <section key={id} id={id} className="nm-block nm-bigquote"><blockquote>“{b.body}”</blockquote>{b.by ? <cite>{b.by}</cite> : null}</section>;
          case 'video':
            return embedUrl(b.url) ? <section key={id} id={id} className="nm-block">{b.title ? <h2>{b.title}</h2> : null}<div className="nm-embed"><iframe src={embedUrl(b.url)!} title={b.title ?? 'Video'} allowFullScreen loading="lazy" /></div></section> : null;
          default:
            return null;
        }
      })}
    </article>
  );
}

function blockTitle(b: PageBlock): string {
  const t: Record<PageBlock['type'], string> = { synopsis: 'Story', stats: 'Numbers', credits: 'Credits', gallery: 'Photos', bloopers: 'Bloopers', trivia: 'Trivia', diary: 'Diary', podcasts: 'Podcast', text: 'Notes', quote: 'Quote', video: 'Video' };
  return ('title' in b && b.title) || t[b.type];
}

/** Podcast episodes: hosted audio plays inline, Spotify/YouTube/Apple embed. */
export function PodcastList({ items, showProject }: { items: (PodcastEpisode & { project?: { slug: string; title: string } | null })[]; showProject?: boolean }) {
  return (
    <ul className="nm-pods">
      {items.map((e) => {
        const src = e.source === 'internal' ? publicFileUrl('public-media', e.storage_path) : e.external_url;
        const embed = e.source !== 'internal' ? embedUrl(e.external_url) : null;
        return (
          <li key={e.id} className={`nm-pod nm-pod-${e.source}`}>
            <div className="nm-pod-head">
              <span className="nm-pod-no">{e.episode_number ? `EP ${String(e.episode_number).padStart(2, '0')}` : 'EP'}</span>
              <div>
                <strong>{e.title}</strong>
                <small>{[showProject && e.project ? e.project.title : null, duration(e.duration_seconds), dateLabel(e.published_at)].filter(Boolean).join(' · ')}</small>
              </div>
              <Waveform seed={e.id} className="nm-pod-wave" />
            </div>
            {e.description ? <p>{e.description}</p> : null}
            {e.source === 'internal' && src ? <audio controls preload="none" src={src} /> : null}
            {embed && e.source === 'spotify' ? <iframe className="nm-pod-embed" src={embed} title={e.title} height="152" loading="lazy" allow="encrypted-media" /> : null}
            {embed && e.source !== 'spotify' ? <div className="nm-embed"><iframe src={embed} title={e.title} loading="lazy" allowFullScreen /></div> : null}
            {!embed && e.source !== 'internal' && e.external_url ? <a className="nm-btn" href={e.external_url} target="_blank" rel="noreferrer">Listen on {e.source[0]!.toUpperCase() + e.source.slice(1)} ↗</a> : null}
          </li>
        );
      })}
    </ul>
  );
}
