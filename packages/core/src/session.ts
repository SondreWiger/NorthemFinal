import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseServer } from './supabase/server';
import { serverEnv } from './env';
import { orgRoleAtLeast } from './roles';
import type { Org, OrgMember, OrgRole, Profile } from './types';
import type { Permission } from './roles';

/** The org this request is for: host in org_domains, else ORG_SLUG. Whitelabel hook. */
export const currentOrg = cache(async (): Promise<Org | null> => {
  const supabase = await supabaseServer();
  const host = (await headers()).get('host')?.split(':')[0]?.toLowerCase() ?? '';
  if (host) {
    const { data } = await supabase.from('org_domains').select('org:orgs(*)').eq('host', host).maybeSingle();
    const org = (data as { org: Org | null } | null)?.org;
    if (org) return org;
  }
  const { data } = await supabase.from('orgs').select('*').eq('slug', serverEnv().orgSlug).maybeSingle();
  return (data as Org | null) ?? null;
});

export interface Session {
  userId: string;
  email: string;
  profile: Profile;
  org: Org;
  member: OrgMember | null;
  role: OrgRole | null;
  perms: Set<string>;
  can: (perm: Permission) => boolean;
  atLeast: (role: OrgRole) => boolean;
}

/** The signed-in user with their org membership, or null. */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;
  const org = await currentOrg();
  if (!org) return null;
  const [{ data: profile }, { data: member }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('org_members').select('*').eq('org_id', org.id).eq('user_id', user.id).maybeSingle(),
  ]);
  const m = member as OrgMember | null;
  const role = m && m.status === 'active' ? m.role : null;
  let perms = new Set<string>();
  if (role) {
    const { data } = await supabase.from('role_permissions').select('perm').eq('org_id', org.id).eq('role', role);
    perms = new Set((data ?? []).map((r: { perm: string }) => r.perm));
  }
  return {
    userId: user.id,
    email: user.email ?? '',
    profile: (profile as Profile) ?? ({ id: user.id, display_name: '', links: [], theme: {}, is_public: true } as unknown as Profile),
    org,
    member: m,
    role,
    perms,
    can: (perm) => role === 'owner' || perms.has(perm),
    atLeast: (r) => orgRoleAtLeast(role, r),
  };
});

/** For pages: signed in and an active member of the org (any role), else redirect. */
export async function requireMember(next = '/'): Promise<Session & { role: OrgRole }> {
  const s = await getSession();
  if (!s) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!s.role) redirect('/no-access');
  return s as Session & { role: OrgRole };
}

/** For admin pages and actions. */
export async function requireRole(min: OrgRole, next = '/'): Promise<Session & { role: OrgRole }> {
  const s = await requireMember(next);
  if (!s.atLeast(min)) redirect('/no-access');
  return s;
}

export async function requirePerm(perm: Permission, next = '/'): Promise<Session & { role: OrgRole }> {
  const s = await requireMember(next);
  if (!s.can(perm)) redirect('/no-access');
  return s;
}
