// Public reads for the marketing sites. Anonymous client (RLS: only published,
// is_public rows), falling back to demo content when Supabase isn't set up.
import 'server-only';
import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import { env, hasSupabase, serverEnv } from './env';
import * as demo from './demo';
import type {
  CreditView, Division, FilmographyItem, Media, Moment, Opening, Person, PodcastEpisode, Project,
  ProjectBundle, PressKit, Theme, Trivia,
} from './types';

export const isDemo = !hasSupabase;

function anon() {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, { auth: { persistSession: false } });
}

const PUBLIC_VIS = ['public'];

export const getOrgId = cache(async (): Promise<string | null> => {
  if (isDemo) return 'demo-org';
  const { data } = await anon().from('orgs').select('id').eq('slug', serverEnv().orgSlug).maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
});

export const getDivisions = cache(async (): Promise<Division[]> => {
  if (isDemo) return demo.demoDivisions;
  const org = await getOrgId();
  if (!org) return [];
  const { data } = await anon().from('divisions').select('*').eq('org_id', org).eq('is_public', true).order('sort');
  return (data as Division[]) ?? [];
});

export async function getDivision(slug: string): Promise<Division | null> {
  return (await getDivisions()).find((d) => d.slug === slug) ?? null;
}

/** Listed public projects, newest first. divisionSlug null = all divisions. */
export const listProjects = cache(async (divisionSlug: string | null, limit = 60): Promise<Project[]> => {
  const divisions = await getDivisions();
  const div = divisionSlug ? divisions.find((d) => d.slug === divisionSlug) : null;
  if (divisionSlug && !div) return [];
  if (isDemo) {
    return demo.demoProjects.filter((p) => !div || p.division_id === div.id).slice(0, limit);
  }
  const org = await getOrgId();
  let q = anon().from('projects').select('*').eq('org_id', org!).in('visibility', PUBLIC_VIS)
    .not('published_at', 'is', null).order('year', { ascending: false, nullsFirst: false }).order('published_at', { ascending: false }).limit(limit);
  if (div) q = q.eq('division_id', div.id);
  const { data } = await q;
  return (data as Project[]) ?? [];
});

/** A public (or unlisted) project page with everything on it. */
export const getProjectBundle = cache(async (slug: string): Promise<ProjectBundle | null> => {
  const divisions = await getDivisions();
  if (isDemo) {
    const project = demo.demoProjects.find((p) => p.slug === slug);
    if (!project) return null;
    const by = <T extends { project_id: string | null }>(xs: T[]) => xs.filter((x) => x.project_id === project.id);
    return {
      project,
      division: divisions.find((d) => d.id === project.division_id) ?? null,
      theme: null,
      credits: by(demo.demoCredits).sort((a, b) => a.billing - b.billing),
      media: by(demo.demoMedia),
      trivia: by(demo.demoTrivia),
      moments: by(demo.demoMoments),
      podcasts: by(demo.demoPodcasts),
    };
  }
  const db = anon();
  const org = await getOrgId();
  const { data: p } = await db.from('projects').select('*').eq('org_id', org!).eq('slug', slug).maybeSingle();
  const project = p as Project | null;
  if (!project) return null;
  const [credits, media, trivia, moments, podcasts, theme] = await Promise.all([
    db.from('credits').select('*, person:people(id, slug, name, photo_url, known_for, profile_id)').eq('project_id', project.id).order('billing'),
    db.from('media').select('*').eq('project_id', project.id).order('sort'),
    db.from('trivia').select('*').eq('project_id', project.id).order('sort'),
    db.from('moments').select('*').eq('project_id', project.id).order('happened_on'),
    db.from('podcast_episodes').select('*').eq('project_id', project.id).order('published_at', { ascending: false }),
    project.theme_id ? db.from('themes').select('*').eq('id', project.theme_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return {
    project,
    division: divisions.find((d) => d.id === project.division_id) ?? null,
    theme: (theme.data as Theme | null) ?? null,
    credits: ((credits.data as CreditView[]) ?? []).filter((c) => c.person),
    media: (media.data as Media[]) ?? [],
    trivia: (trivia.data as Trivia[]) ?? [],
    moments: (moments.data as Moment[]) ?? [],
    podcasts: (podcasts.data as PodcastEpisode[]) ?? [],
  };
});

export interface PersonBundle {
  person: Person;
  credits: FilmographyItem[];
  tagged: Media[];
  podcasts: PodcastEpisode[];
  trivia: (Trivia & { project_slug?: string; project_title?: string })[];
  profileHandle: string | null;
}

/** A person's public page: filmography, tagged photos and bloopers, podcast appearances. */
export const getPersonBundle = cache(async (slug: string): Promise<PersonBundle | null> => {
  if (isDemo) {
    const person = demo.demoPeople.find((p) => p.slug === slug);
    if (!person) return null;
    const credits = demo.demoCredits.filter((c) => c.person_id === person.id).map((c) => {
      const pr = demo.demoProjects.find((x) => x.id === c.project_id)!;
      return { ...c, project: { id: pr.id, slug: pr.slug, title: pr.title, year: pr.year, kind: pr.kind, poster_url: pr.poster_url, division_id: pr.division_id, status: pr.status } };
    });
    const projectIds = new Set(credits.map((c) => c.project_id));
    return {
      person, credits, profileHandle: null,
      tagged: demo.demoMedia.filter((m) => projectIds.has(m.project_id) && m.kind === 'blooper').slice(0, 4),
      podcasts: demo.demoPodcasts.filter((p) => p.project_id && projectIds.has(p.project_id)),
      trivia: demo.demoTrivia.filter((t) => t.person_id === person.id).map((t) => {
        const pr = demo.demoProjects.find((x) => x.id === t.project_id);
        return { ...t, project_slug: pr?.slug, project_title: pr?.title };
      }),
    };
  }
  const db = anon();
  const org = await getOrgId();
  const { data: pe } = await db.from('people').select('*').eq('org_id', org!).eq('slug', slug).maybeSingle();
  const person = pe as Person | null;
  if (!person) return null;
  const [credits, tagged, guests, trivia, profile] = await Promise.all([
    db.from('credits').select('*, project:projects(id, slug, title, year, kind, poster_url, division_id, status)').eq('person_id', person.id),
    db.from('media_people').select('media:media(*)').eq('person_id', person.id),
    db.from('podcast_guests').select('episode:podcast_episodes(*)').eq('person_id', person.id),
    db.from('trivia').select('*, project:projects(slug, title)').eq('person_id', person.id),
    person.profile_id ? db.from('profiles').select('handle').eq('id', person.profile_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const items = ((credits.data as FilmographyItem[]) ?? []).filter((c) => c.project)
    .sort((a, b) => (b.project.year ?? 0) - (a.project.year ?? 0));
  return {
    person,
    credits: items,
    tagged: ((tagged.data as unknown as { media: Media | null }[]) ?? []).map((r) => r.media).filter((m): m is Media => !!m),
    podcasts: ((guests.data as unknown as { episode: PodcastEpisode | null }[]) ?? []).map((r) => r.episode).filter((e): e is PodcastEpisode => !!e),
    trivia: ((trivia.data as unknown as (Trivia & { project: { slug: string; title: string } | null })[]) ?? [])
      .map((t) => ({ ...t, project_slug: t.project?.slug, project_title: t.project?.title })),
    profileHandle: (profile.data as { handle: string | null } | null)?.handle ?? null,
  };
});

export const listPeople = cache(async (limit = 48): Promise<Person[]> => {
  if (isDemo) return demo.demoPeople;
  const org = await getOrgId();
  const { data } = await anon().from('people').select('*').eq('org_id', org!).eq('is_public', true).order('name').limit(limit);
  return (data as Person[]) ?? [];
});

export const listPodcasts = cache(async (limit = 30): Promise<(PodcastEpisode & { project?: Pick<Project, 'slug' | 'title' | 'division_id'> | null })[]> => {
  if (isDemo) return demo.demoPodcasts.map((p) => {
    const pr = demo.demoProjects.find((x) => x.id === p.project_id);
    return { ...p, project: pr ? { slug: pr.slug, title: pr.title, division_id: pr.division_id } : null };
  });
  const org = await getOrgId();
  const { data } = await anon().from('podcast_episodes').select('*, project:projects(slug, title, division_id)')
    .eq('org_id', org!).order('published_at', { ascending: false }).limit(limit);
  return (data as (PodcastEpisode & { project?: Pick<Project, 'slug' | 'title' | 'division_id'> | null })[]) ?? [];
});

export const listOpenings = cache(async (divisionSlug: string | null): Promise<Opening[]> => {
  const divisions = await getDivisions();
  const div = divisionSlug ? divisions.find((d) => d.slug === divisionSlug) : null;
  if (isDemo) return demo.demoOpenings.filter((o) => !div || o.division_id === div.id);
  const org = await getOrgId();
  let q = anon().from('openings').select('*').eq('org_id', org!).eq('is_public', true).eq('is_open', true).order('created_at', { ascending: false });
  if (div) q = q.eq('division_id', div.id);
  const { data } = await q;
  return ((data as Opening[]) ?? []).filter((o) => !o.closes_at || new Date(o.closes_at) > new Date());
});

export async function getOpening(id: string): Promise<Opening | null> {
  if (isDemo) return demo.demoOpenings.find((o) => o.id === id) ?? null;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await anon().from('openings').select('*').eq('id', id).maybeSingle();
  return (data as Opening | null) ?? null;
}

export const listPublicPressKits = cache(async (): Promise<(PressKit & { items: { id: string; title: string; kind: string; url: string | null; storage_path: string | null }[] })[]> => {
  if (isDemo) return demo.demoPressKits.map((k) => ({ ...k, items: [] }));
  const org = await getOrgId();
  const { data } = await anon().from('press_kits').select('*, items:press_kit_items(id, title, kind, url, storage_path)').eq('org_id', org!).eq('audience', 'public');
  return (data as (PressKit & { items: { id: string; title: string; kind: string; url: string | null; storage_path: string | null }[] })[]) ?? [];
});

/** Public URL for a file in a public bucket. */
export function publicFileUrl(bucket: 'public-media' | 'avatars', path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path) || path.startsWith('demo:')) return path;
  return `${env.supabaseUrl}/storage/v1/object/public/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`;
}
