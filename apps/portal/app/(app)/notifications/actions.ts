'use server';
import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@northem/core/supabase/server';

export async function markRead(fd: FormData) {
  const db = await supabaseServer();
  const id = String(fd.get('id') ?? '');
  const q = db.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
  await (id ? q.eq('id', id) : q);
  revalidatePath('/', 'layout');
}

export async function clearRead() {
  const db = await supabaseServer();
  await db.from('notifications').delete().not('read_at', 'is', null);
  revalidatePath('/notifications');
}
