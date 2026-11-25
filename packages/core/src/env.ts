// One place to read configuration. Public values are inlined by Next at build.

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  rootDomain: process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'northem.group',
  portalUrl: process.env.NEXT_PUBLIC_PORTAL_URL ?? 'https://portal.northem.group',
  adminUrl: process.env.NEXT_PUBLIC_ADMIN_URL ?? 'https://admin.northem.group',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://northem.group',
};

/** True when Supabase is configured. Without it the public sites show demo content. */
export const hasSupabase = Boolean(env.supabaseUrl && env.supabaseAnonKey);

export function serverEnv() {
  return {
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    orgSlug: process.env.ORG_SLUG ?? 'northem',
    cookieDomain: process.env.COOKIE_DOMAIN || undefined,
    resendKey: process.env.RESEND_API_KEY ?? '',
    mailFrom: process.env.MAIL_FROM ?? 'Northem <hello@northem.group>',
    mailInbox: process.env.MAIL_INBOX ?? '',
    encKey: process.env.CONNECTIONS_ENC_KEY ?? '',
    spsBaseUrl: (process.env.SPS_BASE_URL ?? 'https://screenplaystudio.fun').replace(/\/$/, ''),
    graphiteBaseUrl: (process.env.GRAPHITE_BASE_URL ?? 'https://graphite.cinderra.fun').replace(/\/$/, ''),
  };
}

/** Division site key -> subdomain and division slug in the database. */
export const SITES = {
  landing: { sub: '', division: null, name: 'Northem' },
  prod: { sub: 'prod', division: 'productions', name: 'Northem Productions' },
  dev: { sub: 'dev', division: 'development', name: 'Northem Development' },
  specprod: { sub: 'specprod', division: 'specprod', name: 'Specprod' },
  so: { sub: 'so', division: 'sonorthem', name: 'SoNorthem' },
} as const;

export function siteUrl(site: keyof typeof SITES, path = '/'): string {
  const sub = SITES[site].sub;
  const base = env.siteUrl.replace(/\/$/, '');
  if (!sub) return base + path;
  try {
    const u = new URL(base);
    u.hostname = `${sub}.${u.hostname}`;
    return u.origin + path;
  } catch {
    return `https://${sub}.${env.rootDomain}${path}`;
  }
}

export function siteForDivisionSlug(slug: string | null | undefined): keyof typeof SITES {
  for (const [key, s] of Object.entries(SITES)) if (s.division === slug) return key as keyof typeof SITES;
  return 'landing';
}
