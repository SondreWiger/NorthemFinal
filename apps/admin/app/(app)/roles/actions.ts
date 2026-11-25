'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@northem/core/supabase/server';
import { PERMISSIONS } from '@northem/core/roles';
import { ORG_ROLES } from '@northem/core/types';
import { requireAdmin } from '@/guard';
import { audit, q } from '@/util';

export async function savePermissions(fd: FormData) {
  const s = await requireAdmin('/roles');
  if (!s.atLeast('owner')) redirect('/no-access');
  const keys = new Set(PERMISSIONS.map((p) => p.key as string));
  const rows = fd.getAll('grant').map(String).map((v) => v.split('|') as [string, string])
    .filter(([r, p]) => ORG_ROLES.includes(r as never) && r !== 'owner' && keys.has(p))
    .map(([role, perm]) => ({ org_id: s.org.id, role, perm }));
  const db = await supabaseServer();
  const { error: delErr } = await db.from('role_permissions').delete().eq('org_id', s.org.id).neq('role', 'owner');
  const { error } = delErr ? { error: delErr } : rows.length ? await db.from('role_permissions').insert(rows) : { error: null };
  await audit(s, 'roles.update', 'role_permissions', null, { grants: rows.length });
  revalidatePath('/roles');
  redirect(`/roles?${q(error ? error.message : 'Permissions saved.')}`);
}
