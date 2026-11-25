'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@northem/core/supabase/server';
import { addPersonByEmail } from '@northem/core/invites';
import { ORG_ROLES, type OrgRole } from '@northem/core/types';
import { requireAdmin, requireCan } from '@/guard';
import { audit, list, q, str } from '@/util';

const back = (msg: string) => redirect(`/team?${q(msg)}`);

export async function invite(fd: FormData) {
  const s = await requireAdmin('/team');
  const role = str(fd, 'role', 10) as OrgRole;
  if (!ORG_ROLES.includes(role)) back('Pick a role.');
  const res = await addPersonByEmail(s, {
    email: str(fd, 'email', 320), orgRole: role, departments: list(fd, 'departments'), title: str(fd, 'title', 120) || null, message: str(fd, 'message', 600) || null,
  });
  revalidatePath('/team');
  back(res.ok ? (res.mode === 'added' ? 'They already had an account, so they are on the team now.' : (res.mailed ? 'Invite sent.' : `Mail isn't set up, so send this link yourself (shown once): ${res.link}`)) : res.error);
}

export async function updateMember(fd: FormData) {
  const s = await requireCan('people.manage', '/team');
  const userId = str(fd, 'user_id', 40);
  const role = str(fd, 'role', 10) as OrgRole;
  const status = str(fd, 'status', 10);
  if (!ORG_ROLES.includes(role)) back('Unknown role.');
  if (userId === s.userId && role !== s.role) back("You can't change your own role.");
  if (s.role !== 'owner' && ORG_ROLES.indexOf(role) >= ORG_ROLES.indexOf(s.role)) back('You can only give roles below your own.');
  const db = await supabaseServer();
  const { data: cur } = await db.from('org_members').select('role').eq('org_id', s.org.id).eq('user_id', userId).maybeSingle();
  const curRole = (cur as { role: OrgRole } | null)?.role;
  if (curRole && s.role !== 'owner' && userId !== s.userId && ORG_ROLES.indexOf(curRole) >= ORG_ROLES.indexOf(s.role)) back('Only an owner can change someone at your level or above.');
  const { data, error } = await db.from('org_members').update({
    role, title: str(fd, 'title', 120) || null, departments: list(fd, 'departments'), status: ['active', 'suspended', 'left'].includes(status) ? status : 'active',
  }).eq('org_id', s.org.id).eq('user_id', userId).select('user_id');
  if (error || !data?.length) back(error?.message ?? 'Not allowed.');
  await audit(s, 'member.update', 'org_members', userId, { role, status });
  revalidatePath('/team');
  back('Saved.');
}

export async function revokeInvite(fd: FormData) {
  const s = await requireCan('people.invite', '/team');
  const id = str(fd, 'id', 40);
  const db = await supabaseServer();
  await db.from('invites').update({ revoked_at: new Date().toISOString() }).eq('id', id);
  await audit(s, 'invite.revoke', 'invites', id);
  back('Invite revoked.');
}
