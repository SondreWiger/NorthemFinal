import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { siteForDivisionSlug } from '@northem/core/env';
import { supabaseServer } from '@northem/core/supabase/server';
import type { CreditView, Division, Media, Moment, PodcastEpisode, Project, Theme, Trivia } from '@northem/core/types';
import { ProjectPage } from '@northem/ui/public';
import { requireAdmin } from '@/guard';

export const metadata: Metadata = { title: 'Preview' };

// The public page as it will look, including unpublished bits the team can see.
export default async function Preview(props: PageProps<'/preview/[id]'>) {
  const { id } = await props.params;
  const s = await requireAdmin(`/preview/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await supabaseServer();
  const { data: p } = await db.from('projects').select('*').eq('id', id).maybeSingle();
  if (!p) notFound();
  const project = p as Project;
  const [credits, media, trivia, moments, podcasts, theme, divisions] = await Promise.all([
    db.from('credits').select('*, person:people(id, slug, name, photo_url, known_for, profile_id)').eq('project_id', id).eq('is_public', true).order('billing'),
    db.from('media').select('*').eq('project_id', id).eq('is_public', true).order('sort'),
    db.from('trivia').select('*').eq('project_id', id).eq('is_public', true).order('sort'),
    db.from('moments').select('*').eq('project_id', id).eq('is_public', true).order('happened_on'),
    db.from('podcast_episodes').select('*').eq('project_id', id).eq('is_public', true).order('published_at', { ascending: false }),
    project.theme_id ? db.from('themes').select('*').eq('id', project.theme_id).maybeSingle() : Promise.resolve({ data: null }),
    db.from('divisions').select('*').eq('org_id', s.org.id),
  ]);
  const divs = (divisions.data as Division[]) ?? [];
  const division = divs.find((d) => d.id === project.division_id) ?? null;
  return (
    <div className="site" data-site={siteForDivisionSlug(division?.slug)}>
      <ProjectPage site={siteForDivisionSlug(division?.slug)} divisions={divs} bundle={{
        project, division, theme: (theme.data as Theme | null) ?? null,
        credits: ((credits.data as CreditView[]) ?? []).filter((c) => c.person), media: (media.data as Media[]) ?? [],
        trivia: (trivia.data as Trivia[]) ?? [], moments: (moments.data as Moment[]) ?? [], podcasts: (podcasts.data as PodcastEpisode[]) ?? [],
      }} />
    </div>
  );
}
