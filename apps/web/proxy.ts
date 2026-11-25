import { NextResponse, type NextRequest } from 'next/server';

// One deployment, five sites. The hostname picks the site and the request is
// rewritten into that site's folder: prod.northem.group/work -> /prod/work.
// Works locally with prod.localhost:3000 and on Vercel preview URLs with ?site=.

const SITES = ['prod', 'dev', 'specprod', 'so'] as const;
const ALIASES: Record<string, (typeof SITES)[number]> = { productions: 'prod', development: 'dev', sonorthem: 'so' };

export function proxy(request: NextRequest) {
  const host = (request.headers.get('host') ?? '').split(':')[0]!.toLowerCase();
  const sub = host.split('.')[0]!;
  const url = request.nextUrl.clone();

  // Preview deployments have one hostname: ?site=specprod sets a cookie.
  const param = url.searchParams.get('site');
  const cookieSite = request.cookies.get('nm_site')?.value;
  let site: string = (SITES as readonly string[]).includes(sub) ? sub : ALIASES[sub] ?? 'landing';
  const isPreview = host.endsWith('.vercel.app') || host === 'localhost';
  if (isPreview && param && ['landing', ...SITES].includes(param)) site = param;
  else if (isPreview && cookieSite && ['landing', ...SITES].includes(cookieSite)) site = cookieSite;

  url.pathname = `/${site}${url.pathname === '/' ? '' : url.pathname}`;
  const res = NextResponse.rewrite(url);
  if (isPreview && param) res.cookies.set('nm_site', site, { path: '/', sameSite: 'lax' });
  return res;
}

export const config = {
  matcher: ['/((?!_next/|api/|favicon|icon|apple-icon|robots.txt|sitemap.xml|.*\\.[a-z0-9]{2,5}$).*)'],
};
