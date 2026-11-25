// Page bodies shared by every site. Each site folder's page files are thin
// wrappers that pass their site key, so URLs and behaviour stay identical
// while the look comes from that site's stylesheet.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { SiteKey } from '@northem/core/types';
import { env } from '@northem/core/env';
import {
  getDivisions, getOpening, getPersonBundle, getProjectBundle, listOpenings, listPeople, listPodcasts, listProjects,
} from '@northem/core/queries';
import { OpeningList, PersonPage, PodcastList, ProjectGrid, ProjectPage, Avatar } from '@northem/ui/public';
import { SiteForm } from '@northem/ui/forms';
import { SITE_CONFIG } from './sites';
import { submitForm } from './actions';


type Params<K extends string> = { params: Promise<Record<K, string>> };

function PageHead({ kicker, title, intro }: { kicker: string; title: string; intro?: string }) {
  return (
    <header className="page-head nm-wrap">
      <span className="nm-kicker">{kicker}</span>
      <h1>{title}</h1>
      {intro ? <p>{intro}</p> : null}
    </header>
  );
}

export async function WorkPage({ site }: { site: SiteKey }) {
  const c = SITE_CONFIG[site];
  const [projects, divisions] = await Promise.all([listProjects(c.division), getDivisions()]);
  return (
    <>
      <PageHead kicker={c.name} title={site === 'dev' ? 'Products & work' : site === 'specprod' ? 'Field work' : 'The work'} intro={c.description} />
      <section className="nm-wrap page-body"><ProjectGrid projects={projects} divisions={divisions} site={site} variant={c.workVariant} /></section>
    </>
  );
}

export async function ProjectRoute({ site, params }: { site: SiteKey } & Params<'slug'>) {
  const { slug } = await params;
  const [bundle, divisions] = await Promise.all([getProjectBundle(slug), getDivisions()]);
  if (!bundle) notFound();
  return <ProjectPage bundle={bundle} site={site} divisions={divisions} />;
}

export async function projectMetadata({ params }: Params<'slug'>): Promise<Metadata> {
  const { slug } = await params;
  const b = await getProjectBundle(slug);
  if (!b) return { title: 'Not found' };
  const p = b.project;
  return {
    title: p.title, description: p.logline ?? undefined,
    openGraph: { title: p.title, description: p.logline ?? undefined, images: p.poster_url ? [p.poster_url] : undefined },
    robots: p.visibility === 'unlisted' ? { index: false } : undefined,
  };
}

export async function PeoplePage({ site }: { site: SiteKey }) {
  const people = await listPeople();
  const c = SITE_CONFIG[site];
  return (
    <>
      <PageHead kicker={c.name} title={site === 'prod' ? 'Faces' : site === 'specprod' ? 'The crew' : 'People'} intro="Everyone who has made something with us. Click anyone to see what else they've done." />
      <section className="nm-wrap page-body">
        <ul className="people-grid">
          {people.map((p) => (
            <li key={p.id}><a href={`/people/${p.slug}`}><Avatar name={p.name} src={p.photo_url} size={96} /><strong>{p.name}</strong><small>{p.known_for}</small></a></li>
          ))}
        </ul>
      </section>
    </>
  );
}

export async function PersonRoute({ site, params }: { site: SiteKey } & Params<'slug'>) {
  const { slug } = await params;
  const [bundle, divisions] = await Promise.all([getPersonBundle(slug), getDivisions()]);
  if (!bundle) notFound();
  return <PersonPage bundle={bundle} site={site} divisions={divisions} portalUrl={env.portalUrl} />;
}

export async function personMetadata({ params }: Params<'slug'>): Promise<Metadata> {
  const { slug } = await params;
  const b = await getPersonBundle(slug);
  return b ? { title: b.person.name, description: b.person.bio ?? b.person.known_for ?? undefined } : { title: 'Not found' };
}

export async function JoinPage({ site }: { site: SiteKey }) {
  const c = SITE_CONFIG[site];
  const openings = await listOpenings(c.division);
  return (
    <>
      <PageHead kicker={c.name} title={site === 'prod' ? 'Casting & crew' : 'Join us'} intro="Open calls, jobs and collaborations. Nothing that fits? Send an open application below." />
      <section className="nm-wrap page-body"><OpeningList openings={openings} /></section>
      <section className="nm-wrap page-body form-panel">
        <h2>Open application</h2>
        <SiteForm action={submitForm} form="application" division={c.division} submitLabel="Send application" successTitle="Application sent"
          fields={[{ name: 'name', label: 'Your name', required: true }, { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'role', label: 'What you do', placeholder: 'Gaffer, actor, developer, editor…' }, { name: 'portfolio', label: 'Portfolio or showreel', type: 'url' },
            { name: 'message', label: 'Tell us about you', type: 'textarea', required: true }]} />
      </section>
    </>
  );
}

export async function OpeningRoute({ site, params }: { site: SiteKey } & Params<'id'>) {
  const { id } = await params;
  const o = await getOpening(id);
  if (!o || !o.is_open) notFound();
  const c = SITE_CONFIG[site];
  return (
    <>
      <PageHead kicker={`${o.kind} · ${o.location ?? 'Anywhere'}`} title={o.title} intro={o.body ?? undefined} />
      <section className="nm-wrap page-body form-panel">
        <SiteForm action={submitForm} form={o.kind === 'casting' ? 'casting' : 'application'} division={c.division} openingId={o.id}
          submitLabel="Apply" successTitle="Application sent"
          fields={[{ name: 'name', label: 'Your name', required: true }, { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'phone', label: 'Phone', type: 'tel' }, { name: 'portfolio', label: o.kind === 'casting' ? 'Self-tape or photos (link)' : 'Portfolio', type: 'url' },
            ...o.questions.map((q) => ({ name: `q_${q.id}`, label: q.label, type: q.type, required: q.required, wide: true })),
            { name: 'message', label: 'Why you', type: 'textarea', required: true }]} />
      </section>
    </>
  );
}

export async function ContactPage({ site }: { site: SiteKey }) {
  const c = SITE_CONFIG[site];
  return (
    <>
      <PageHead kicker={c.name} title={c.form.title} intro={c.form.intro} />
      <section className="nm-wrap page-body form-panel">
        <SiteForm action={submitForm} form={c.form.form} division={c.division} fields={c.form.fields} submitLabel={c.form.submit} successTitle={c.form.success} />
      </section>
    </>
  );
}

export async function PodcastPage({ site }: { site: SiteKey }) {
  const eps = await listPodcasts();
  return (
    <>
      <PageHead kicker="Northem podcast" title="Behind the work" intro="We sit down after a project and talk about what really happened. Bloopers included." />
      <section className="nm-wrap page-body"><PodcastList items={eps} showProject /></section>
    </>
  );
}

export const siteMeta = (site: SiteKey, title: string): Metadata => ({ title, description: SITE_CONFIG[site].description });
