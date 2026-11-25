import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { env, hasSupabase } from '../env';

/**
 * Refreshes the Supabase session in proxy.ts and returns the response plus
 * the user (null when signed out). Apps add their own redirects on top.
 */
export async function refreshSession(request: NextRequest, response = NextResponse.next({ request })) {
  if (!hasSupabase) return { response, user: null };
  const configured = process.env.COOKIE_DOMAIN || undefined;
  const host = request.nextUrl.hostname.toLowerCase();
  const bare = configured?.replace(/^\./, '').toLowerCase();
  // Same rule as cookieDomainFor(): previews on other hosts keep host-only cookies.
  const domain = bare && (host === bare || host.endsWith(`.${bare}`)) ? configured : undefined;
  let res = response;
  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookieOptions: domain ? { domain } : undefined,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        res = NextResponse.next({ request });
        for (const { name, value, options } of list) res.cookies.set(name, value, { ...options, ...(domain ? { domain } : {}) });
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  return { response: res, user: data.user };
}
