import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@northem/core/supabase/server';

// Attachments from the public forms: the storage policy checks forms.read.
export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get('path') ?? '';
  if (!path || path.includes('..')) return new NextResponse('Not found', { status: 404 });
  const db = await supabaseServer();
  const { data, error } = await db.storage.from('submissions').createSignedUrl(path, 120, { download: true });
  if (error || !data) return new NextResponse('Not allowed', { status: 403 });
  return NextResponse.redirect(data.signedUrl);
}
