import { siteForDivisionSlug, siteUrl, SITES } from '@northem/core/env';
import type { Division, SiteKey } from '@northem/core/types';

/** Link to a project's page on the site that owns it (relative when it's this site). */
export function projectHref(p: { slug: string; division_id: string | null }, divisions: Division[], current: SiteKey): string {
  const div = divisions.find((d) => d.id === p.division_id);
  const site = siteForDivisionSlug(div?.slug);
  const path = site === 'landing' ? `/work/${p.slug}` : `/p/${p.slug}`;
  return site === current ? path : siteUrl(site, path);
}

export function personHref(slug: string): string {
  return `/people/${slug}`;
}

export function divisionHref(divisionSlug: string, current: SiteKey): string {
  const site = siteForDivisionSlug(divisionSlug);
  return site === current ? '/' : siteUrl(site, '/');
}

export function siteName(site: SiteKey) {
  return SITES[site].name;
}
