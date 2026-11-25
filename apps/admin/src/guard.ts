import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { requireMember, type Session } from '@northem/core/session';
import { supabaseServer } from '@northem/core/supabase/server';
import type { Permission } from '@northem/core/roles';
import type { OrgRole } from '@northem/core/types';

export type AdminSession = Session & { role: OrgRole };

// Permissions that make the admin useful. Chat-only perms don't count.
const ADMIN_PERMS: Permission[] = ['projects.create', 'projects.manage_all', 'people.manage', 'people.invite', 'forms.read', 'forms.manage',
  'openings.manage', 'sites.edit', 'podcasts.publish', 'integrations.manage', 'audit.read'];

/** Projects this person leads (admins lead all of them through my_project_role). */
export const ledProjectIds = cache(async (userId: string) => {
  const db = await supabaseServer();
  const { data } = await db.from('project_members').select('project_id').eq('user_id', userId).eq('role', 'lead');
  return ((data as { project_id: string }[]) ?? []).map((r) => r.project_id);
});

/** Signed in, a member, and either holds an admin permission or leads a project. */
export async function requireAdmin(next = '/'): Promise<AdminSession> {
  const s = await requireMember(next);
  if (ADMIN_PERMS.some((p) => s.can(p))) return s;
  if ((await ledProjectIds(s.userId)).length) return s;
  redirect('/no-access');
}

export async function requireCan(perm: Permission, next = '/'): Promise<AdminSession> {
  const s = await requireAdmin(next);
  if (!s.can(perm)) redirect('/no-access');
  return s;
}
