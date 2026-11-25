import 'server-only';
import { cookies, headers } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { env, serverEnv } from '../env';

/**
 * Supabase client acting as the signed-in visitor (RLS applies).
 * The session cookie is scoped to COOKIE_DOMAIN (".northem.group") so one
 * sign-in covers portal and admin.
 */
export async function supabaseServer() {
  const store = await cookies();
  const host = (await headers()).get('host')?.split(':')[0] ?? '';
  const domain = cookieDomainFor(host, serverEnv().cookieDomain);
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookieOptions: domain ? { domain } : undefined,
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, { ...options, ...(domain ? { domain } : {}) });
        } catch {
          // Called from a Server Component: the proxy refreshes the session instead.
        }
      },
    },
  });
}

/**
 * Only share the cookie across subdomains when we're actually on that domain.
 * On *.vercel.app previews or localhost a ".northem.group" cookie would be
 * rejected by the browser and sign-in would silently not stick.
 */
export function cookieDomainFor(host: string, domain: string | undefined): string | undefined {
  if (!domain) return undefined;
  const bare = domain.replace(/^\./, '').toLowerCase();
  const h = host.toLowerCase();
  return h === bare || h.endsWith(`.${bare}`) ? domain : undefined;
}
