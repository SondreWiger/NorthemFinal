import type { Division, Opening, Project, SiteKey } from '@northem/core/types';
import { KIND_LABEL, STATUS_LABEL } from '@northem/core/format';
import { Poster } from '../poster';
import { projectHref } from './links';

export function ProjectGrid({ projects, divisions, site, variant = 'posters' }: { projects: Project[]; divisions: Division[]; site: SiteKey; variant?: 'posters' | 'list' | 'frames' }) {
  if (!projects.length) return <p className="nm-sub">Nothing public yet. Soon.</p>;
  return (
    <ul className={`nm-grid nm-grid-${variant}`}>
      {projects.map((p, i) => (
        <li key={p.id} style={{ ['--i' as string]: i }}>
          <a href={projectHref(p, divisions, site)} className="nm-pcard">
            <Poster title={p.title} seed={p.id} kind={p.kind} src={p.poster_url} year={p.year} hint={`${p.locations.join(' ')} ${p.theme_overrides?.texture ?? ''}`} />
            <span className="nm-pcard-meta">
              <strong>{p.title}</strong>
              <small>{KIND_LABEL[p.kind]}{p.year ? ` · ${p.year}` : ''}{['released', 'live'].includes(p.status) ? '' : ` · ${STATUS_LABEL[p.status]}`}</small>
              {p.logline ? <em>{p.logline}</em> : null}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

const OPENING_LABEL: Record<Opening['kind'], string> = { job: 'Job', crew: 'Crew', casting: 'Casting', collab: 'Collaboration', internship: 'Internship' };

export function OpeningList({ openings, hrefBase = '/join' }: { openings: Opening[]; hrefBase?: string }) {
  if (!openings.length) return <p className="nm-sub">No open calls right now, but we always read open applications.</p>;
  return (
    <ul className="nm-openings">
      {openings.map((o) => (
        <li key={o.id}>
          <a href={`${hrefBase}/${o.id}`}>
            <span className="nm-kicker">{OPENING_LABEL[o.kind]}{o.location ? ` · ${o.location}` : ''}</span>
            <strong>{o.title}</strong>
            {o.body ? <small>{o.body.slice(0, 140)}{o.body.length > 140 ? '…' : ''}</small> : null}
            <span className="nm-arrow" aria-hidden>→</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export function DemoBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return <div className="nm-demo" role="note">Preview with sample content. Connect Supabase to show real projects.</div>;
}

export type { SiteKey };
