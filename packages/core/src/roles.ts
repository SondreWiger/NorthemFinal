import { ORG_ROLES, PROJECT_ROLES, type OrgRole, type ProjectRole } from './types';

// Mirrors the Postgres enum order. The database is the authority (RLS); these
// helpers only decide what to show, never what is allowed.

export function orgRoleAtLeast(role: OrgRole | null | undefined, min: OrgRole): boolean {
  if (!role) return false;
  return ORG_ROLES.indexOf(role) >= ORG_ROLES.indexOf(min);
}

export function projectRoleAtLeast(role: ProjectRole | null | undefined, min: ProjectRole): boolean {
  if (!role) return false;
  return PROJECT_ROLES.indexOf(role) >= PROJECT_ROLES.indexOf(min);
}

export const ORG_ROLE_LABEL: Record<OrgRole, string> = {
  guest: 'Guest',
  press: 'Press',
  cast: 'Cast',
  crew: 'Crew',
  producer: 'Director / producer',
  admin: 'Admin',
  owner: 'Owner',
};

export const ORG_ROLE_HINT: Record<OrgRole, string> = {
  guest: 'Sees only what they are invited to.',
  press: 'Press kits and public material.',
  cast: 'Their projects, call sheets, the team list and chat.',
  crew: 'All internal projects, documents for their department, chat.',
  producer: 'Creates projects, invites people, reads applications.',
  admin: 'Runs everything except ownership.',
  owner: 'Everything, including roles and domains.',
};

export const PROJECT_ROLE_LABEL: Record<ProjectRole, string> = {
  guest: 'Guest',
  cast: 'Cast',
  crew: 'Crew',
  head: 'Head of department',
  lead: 'Lead (director / producer)',
};

export const PERMISSIONS = [
  { key: 'projects.create', label: 'Create projects' },
  { key: 'projects.manage_all', label: 'Manage every project' },
  { key: 'people.manage', label: 'Manage people and roles' },
  { key: 'people.invite', label: 'Invite people' },
  { key: 'forms.read', label: 'Read the inbox' },
  { key: 'forms.manage', label: 'Handle inbox items' },
  { key: 'openings.manage', label: 'Post jobs and casting calls' },
  { key: 'chat.create_channel', label: 'Create chat channels' },
  { key: 'chat.moderate', label: 'Moderate chat' },
  { key: 'sites.edit', label: 'Edit sites, themes and press kits' },
  { key: 'podcasts.publish', label: 'Publish podcast episodes' },
  { key: 'integrations.manage', label: 'Manage integrations' },
  { key: 'audit.read', label: 'Read the audit log' },
] as const;
export type Permission = (typeof PERMISSIONS)[number]['key'];

/** Departments, grouped by the kind of work. Groups only shape the pickers; the stored value is the key. */
export const DEPARTMENT_GROUPS = [
  { key: 'film', label: 'Film and production', items: [
    'directing', 'producing', 'writing', 'cast', 'camera', 'lighting', 'grip', 'sound', 'art',
    'costume', 'makeup', 'locations', 'production', 'post', 'vfx', 'music'] },
  { key: 'specprod', label: 'Specialty shoots', items: ['drone', 'rigging', 'stunts', 'underwater', 'safety'] },
  { key: 'dev', label: 'Development', items: [
    'product', 'design', 'engineering', 'frontend', 'backend', 'mobile', 'devops', 'qa', 'data', 'security', 'support'] },
  { key: 'social', label: 'Social and marketing', items: ['social', 'content', 'community', 'marketing', 'partnerships'] },
] as const;

export const DEPARTMENTS = DEPARTMENT_GROUPS.flatMap((g) => g.items);
export type Department = (typeof DEPARTMENTS)[number];

const DEPT_NAMES: Record<string, string> = {
  vfx: 'VFX', qa: 'QA / testing', devops: 'DevOps', ux: 'UX', post: 'Post-production', mobile: 'Mobile apps',
  frontend: 'Frontend', backend: 'Backend', data: 'Data', support: 'Customer support',
};
/** "camera" -> "Camera", "qa" -> "QA / testing". */
export const deptLabel = (d: string) => DEPT_NAMES[d] ?? d.charAt(0).toUpperCase() + d.slice(1);

/** Which department group a division's people mostly come from, so pickers can show it first. */
export function deptGroupForDivision(slug?: string | null): string | undefined {
  return ({ productions: 'film', development: 'dev', specprod: 'specprod', sonorthem: 'social', so: 'social' } as Record<string, string>)[slug ?? ''];
}
