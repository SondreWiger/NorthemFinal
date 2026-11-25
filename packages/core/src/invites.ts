import 'server-only';
import { supabaseAdmin } from './supabase/admin';
import { supabaseServer } from './supabase/server';
import { newToken } from './crypto';
import { addedMail, inviteMail, sendMail } from './mail';
import { env } from './env';
import { orgRoleAtLeast, ORG_ROLE_LABEL, PROJECT_ROLE_LABEL } from './roles';
import { ORG_ROLES, type OrgRole, type ProjectRole } from './types';
import type { Session } from './session';

export interface AddPersonInput {
  email: string;
  orgRole: OrgRole;
  projectId?: string | null;
  projectRole?: ProjectRole | null;
  departments?: string[];
  title?: string | null;
  personId?: string | null;   // the credited person they become
  message?: string | null;
}

export type AddPersonResult =
  | { ok: true; mode: 'added' | 'invited'; mailed: boolean; link?: string }
  | { ok: false; error: string };

const INVITE_DAYS = 14;

/**
 * Add someone by email. Existing account: add to org/project now and mail
 * them. No account: create a one-time invite and mail the link. Permission is
 * checked here with the caller's own client before the service role is used.
 */
export async function addPersonByEmail(s: Session, input: AddPersonInput): Promise<AddPersonResult> {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, error: 'That email address looks wrong.' };
  if (!ORG_ROLES.includes(input.orgRole)) return { ok: false, error: 'Unknown role.' };

  const userDb = await supabaseServer();
  let projectTitle: string | null = null;
  if (input.projectId) {
    const { data: role } = await userDb.rpc('my_project_role_rpc', { p_project: input.projectId });
    if (role !== 'lead' && !s.can('people.invite')) return { ok: false, error: 'Only project leads can add people to this project.' };
    const { data: p } = await userDb.from('projects').select('title').eq('id', input.projectId).maybeSingle();
    projectTitle = (p as { title: string } | null)?.title ?? null;
    if (!projectTitle) return { ok: false, error: 'Project not found.' };
  } else if (!s.can('people.invite')) {
    return { ok: false, error: 'You are not allowed to invite people.' };
  }
  // Nobody grants a role at or above their own, except owners.
  if (s.role !== 'owner' && orgRoleAtLeast(input.orgRole, s.role ?? 'guest')) {
    return { ok: false, error: `You can only give roles below ${ORG_ROLE_LABEL[s.role ?? 'guest']}.` };
  }

  const admin = supabaseAdmin();
  const brand = s.org.branding?.product_name ?? s.org.name;
  const inviter = s.profile.display_name || s.email;
  const roleLabel = input.projectRole ? PROJECT_ROLE_LABEL[input.projectRole] : ORG_ROLE_LABEL[input.orgRole];
  const { data: existingId } = await admin.rpc('user_id_by_email', { p_email: email });

  if (existingId) {
    const uid = existingId as string;
    const { data: m } = await admin.from('org_members').select('role, status').eq('org_id', s.org.id).eq('user_id', uid).maybeSingle();
    const cur = m as { role: OrgRole; status: string } | null;
    if (!cur) {
      await admin.from('org_members').insert({ org_id: s.org.id, user_id: uid, role: input.orgRole, title: input.title ?? null, departments: input.departments ?? [] });
    } else if (cur.status !== 'active' || !orgRoleAtLeast(cur.role, input.orgRole)) {
      await admin.from('org_members').update({ status: 'active', role: orgRoleAtLeast(cur.role, input.orgRole) ? cur.role : input.orgRole })
        .eq('org_id', s.org.id).eq('user_id', uid);
    }
    if (input.projectId && input.projectRole) {
      const { error } = await admin.from('project_members').upsert({
        project_id: input.projectId, user_id: uid, role: input.projectRole, departments: input.departments ?? [], title: input.title ?? null, added_by: s.userId,
      });
      if (error) return { ok: false, error: 'Could not add them to the project.' };
    }
    if (input.personId) {
      await admin.from('people').update({ profile_id: uid }).eq('id', input.personId).is('profile_id', null);
    }
    await admin.from('audit_log').insert({ org_id: s.org.id, actor_id: s.userId, action: 'member.added', target_table: 'org_members', target_id: uid, detail: { email, project_id: input.projectId ?? null } });
    let mailed = false;
    if (projectTitle) {
      const mail = addedMail({ brand, inviter, project: projectTitle, role: roleLabel, url: `${env.portalUrl}/projects/${input.projectId}` });
      mailed = (await sendMail({ to: email, ...mail })).ok;
    }
    return { ok: true, mode: 'added', mailed };
  }

  const { token, hash } = newToken();
  // Replace any older pending invite for the same address and project.
  await admin.from('invites').update({ revoked_at: new Date().toISOString() })
    .eq('org_id', s.org.id).eq('email', email).is('accepted_at', null).is('revoked_at', null);
  const { error } = await admin.from('invites').insert({
    org_id: s.org.id, email, token_hash: hash, org_role: input.orgRole,
    project_id: input.projectId ?? null, project_role: input.projectId ? input.projectRole ?? 'crew' : null,
    departments: input.departments ?? [], title: input.title ?? null, person_id: input.personId ?? null,
    message: input.message ?? null, invited_by: s.userId,
    expires_at: new Date(Date.now() + INVITE_DAYS * 86400_000).toISOString(),
  });
  if (error) return { ok: false, error: 'Could not create the invite.' };
  await admin.from('audit_log').insert({ org_id: s.org.id, actor_id: s.userId, action: 'invite.sent', target_table: 'invites', detail: { email, project_id: input.projectId ?? null } });
  const mail = inviteMail({ brand, inviter, project: projectTitle, role: roleLabel, url: `${env.portalUrl}/invite/${token}`, message: input.message, expiresDays: INVITE_DAYS });
  const sent = await sendMail({ to: email, ...mail });
  // Without mail the inviter needs the link once, to send it themselves.
  return { ok: true, mode: 'invited', mailed: sent.ok, link: sent.ok ? undefined : `${env.portalUrl}/invite/${token}` };
}
