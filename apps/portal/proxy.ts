import { NextResponse, type NextRequest } from 'next/server';
import { refreshSession } from '@northem/core/supabase/proxy';

// Keep the Supabase session fresh and send signed-out visitors to /login.
const PUBLIC = ['/login', '/auth', '/invite', '/no-access'];

export async function proxy(request: NextRequest) {
  const { response, user } = await refreshSession(request);
  const path = request.nextUrl.pathname;
  if (!user && !PUBLIC.some((p) => path === p || path.startsWith(p + '/'))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = path === '/' ? '' : `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/|favicon|icon|apple-icon|robots.txt|.*\\.[a-z0-9]{2,5}$).*)'],
};
