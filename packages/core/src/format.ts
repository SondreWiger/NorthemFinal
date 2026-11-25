import type { ProjectKind, ProjectStatus, SubmissionForm } from './types';

export const KIND_LABEL: Record<ProjectKind, string> = {
  feature: 'Feature', short: 'Short film', documentary: 'Documentary', series: 'Series', episode: 'Episode',
  commercial: 'Commercial', music_video: 'Music video', branded: 'Branded content', social: 'Social series',
  specialty_shoot: 'Specialty shoot', website: 'Website', app: 'App', tool: 'Tool', platform: 'Platform', game: 'Game', other: 'Project',
};

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  idea: 'Idea', development: 'In development', pre_production: 'Pre-production', production: 'Shooting',
  post_production: 'In post', building: 'Building', beta: 'Beta', released: 'Released', live: 'Live', on_hold: 'On hold', archived: 'Archived',
};

export const FORM_LABEL: Record<SubmissionForm, string> = {
  contact: 'Message', pitch: 'Pitch', application: 'Application', casting: 'Casting submission',
  collab: 'Collaboration request', press: 'Press request', newsletter: 'Newsletter sign-up', client: 'Project brief',
};

export function duration(seconds: number | null | undefined): string {
  if (!seconds) return '';
  const m = Math.round(seconds / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
}

export function dateLabel(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { timeZone: 'Europe/Oslo', ...opts });
}

export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return dateLabel(iso);
}

export function slugify(s: string): string {
  return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'untitled';
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';
}

/** Turn Spotify / YouTube / Apple links into embeddable URLs. */
export function embedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('open.spotify.com') && u.pathname.length > 1) return `https://open.spotify.com/embed${u.pathname}`;
    if (u.hostname === 'youtu.be') return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`;
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v') ?? (u.pathname.startsWith('/embed/') ? u.pathname.split('/')[2] : null);
      return v ? `https://www.youtube-nocookie.com/embed/${v}` : null;
    }
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean).pop();
      return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
    }
    if (u.hostname.includes('podcasts.apple.com')) return url.replace('podcasts.apple.com', 'embed.podcasts.apple.com');
  } catch { /* not a URL */ }
  return null;
}
