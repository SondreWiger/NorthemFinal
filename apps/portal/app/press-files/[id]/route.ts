import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@northem/core/supabase/server';

export async function GET(_req: NextRequest, ctx: RouteContext<'/press-files/[id]'>) {
  const { id } = await ctx.params;
  const db = await supabaseServer();
  const { data } = await db.from('press_kit_items').select('storage_path').eq('id', id).maybeSingle();
  const path = (data as { storage_path: string | null } | null)?.storage_path;
  if (!path) return new NextResponse('Not found', { status: 404 });
  const { data: signed, error } = await db.storage.from('press').createSignedUrl(path, 120, { download: true });
  if (error || !signed) return new NextResponse('Not allowed', { status: 403 });
  return NextResponse.redirect(signed.signedUrl);
}
