'use server';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@northem/core/supabase/server';
import { slugify } from '@northem/core/format';
import { requireAdmin } from '@/guard';
import { audit, bool, cleanName, isUuid, linesToLinks, opt, q, rls, str } from '@/util';

export async function createPerson(fd: FormData) {
  const s = await requireAdmin('/credits');
  const name = str(fd, 'name', 120);
  if (!name) redirect(`/credits?${q('Add a name.')}`);
  const db = await supabaseServer();
  const { data, error } = await db.from('people').insert({ org_id: s.org.id, name, slug: slugify(str(fd, 'slug', 60) || name), known_for: opt(fd, 'known_for', 80), created_by: s.userId }).select('id').single();
  if (error || !data) redirect(`/credits?${q(error?.code === '23505' ? 'That web address is taken. Try another slug.' : rls(error?.message, "You can't add people."))}`);
  redirect(`/credits/${(data as { id: string }).id}?${q('Added.')}`);
}

export async function savePerson(fd: FormData) {
  const s = await requireAdmin('/credits');
  const id = str(fd, 'id', 40);
  const db = await supabaseServer();
  const patch: Record<string, unknown> = {
    name: str(fd, 'name', 120), slug: slugify(str(fd, 'slug', 60) || str(fd, 'name', 120)), known_for: opt(fd, 'known_for', 80), bio: opt(fd, 'bio', 4000),
    links: linesToLinks(fd.getAll('link_label'), fd.getAll('link_url')), is_public: bool(fd, 'is_public'), profile_id: isUuid(str(fd, 'profile_id', 40)) ? str(fd, 'profile_id', 40) : null,
  };
  const photo = fd.get('photo');
  if (photo instanceof File && photo.size > 0) {
    if (photo.size > 8 * 1024 * 1024 || !photo.type.startsWith('image/')) redirect(`/credits/${id}?${q('Photos must be images up to 8 MB.')}`);
    const path = `${s.org.id}/people/${randomUUID()}-${cleanName(photo.name)}`;
    const { error } = await db.storage.from('public-media').upload(path, photo, { contentType: photo.type });
    if (error) redirect(`/credits/${id}?${q(`Upload failed: ${error.message}`)}`);
    patch.photo_url = db.storage.from('public-media').getPublicUrl(path).data.publicUrl;
  }
  const { data, error } = await db.from('people').update(patch).eq('id', id).select('id');
  if (error || !data?.length) redirect(`/credits/${id}?${q(error?.code === '23505' ? 'That slug or profile is already used by someone else.' : rls(error?.message, "You can't edit this person."))}`);
  await audit(s, 'person.update', 'people', id);
  revalidatePath('/credits');
  redirect(`/credits/${id}?${q('Saved.')}`);
}

export async function deletePerson(fd: FormData) {
  const s = await requireAdmin('/credits');
  const id = str(fd, 'id', 40);
  const db = await supabaseServer();
  const { data } = await db.from('people').delete().eq('id', id).select('id');
  if (!data?.length) redirect(`/credits/${id}?${q('Only people managers can delete.')}`);
  await audit(s, 'person.delete', 'people', id);
  redirect(`/credits?${q('Deleted, with their credits.')}`);
}
