import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@northem/core/supabase/server';

// Downloads go through here: RLS decides whether the document row is visible,
// then the storage policy allows a short-lived signed URL.
export async function GET(_req: NextRequest, ctx: RouteContext<'/files/[id]'>) {
  const { id } = await ctx.params;
  const db = await supabaseServer();
  const { data } = await db.from('documents').select('storage_path, title').eq('id', id).maybeSingle();
  const doc = data as { storage_path: string | null; title: string } | null;
  if (!doc?.storage_path) return new NextResponse('Not found', { status: 404 });
  const { data: signed, error } = await db.storage.from('project-files').createSignedUrl(doc.storage_path, 60, { download: false });
  if (error || !signed) return new NextResponse('Not allowed', { status: 403 });
  return NextResponse.redirect(signed.signedUrl);
}
