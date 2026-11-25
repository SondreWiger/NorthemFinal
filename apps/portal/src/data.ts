import 'server-only';
import { cache } from 'react';
import { supabaseServer } from '@northem/core/supabase/server';
import type { ChatChannel, Profile, Project, ProjectRole } from '@northem/core/types';

export const myProjects = cache(async (orgId: string, userId: string) => {
  const db = await supabaseServer();
  const [{ data: mine }, { data: visible }] = await Promise.all([
    db.from('project_members').select('role, title, project:projects(*)').eq('user_id', userId),
    db.from('projects').select('*').eq('org_id', orgId).order('updated_at', { ascending: false }).limit(200),
  ]);
  const roles = new Map<string, { role: ProjectRole; title: string | null }>();
  for (const m of (mine as unknown as { role: ProjectRole; title: string | null; project: Project | null }[]) ?? []) {
    if (m.project) roles.set(m.project.id, { role: m.role, title: m.title });
  }
  const all = ((visible as Project[]) ?? []);
  return { all, mine: all.filter((p) => roles.has(p.id)), roles };
});

export async function projectRole(projectId: string): Promise<ProjectRole | null> {
  const db = await supabaseServer();
  const { data } = await db.rpc('my_project_role_rpc', { p_project: projectId });
  return (data as ProjectRole | null) ?? null;
}

export const profilesById = async (ids: string[]): Promise<Map<string, Profile>> => {
  const uniq = [...new Set(ids.filter(Boolean))];
  if (!uniq.length) return new Map();
  const db = await supabaseServer();
  const { data } = await db.from('profiles').select('*').in('id', uniq);
  return new Map(((data as Profile[]) ?? []).map((p) => [p.id, p]));
};

export const unreadCounts = cache(async () => {
  const db = await supabaseServer();
  const [{ data: chats }, { count }] = await Promise.all([
    db.rpc('chat_unread'),
    db.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null),
  ]);
  const rows = (chats as { channel_id: string; unread: number }[]) ?? [];
  return { chat: rows.reduce((a, r) => a + Number(r.unread), 0), byChannel: new Map(rows.map((r) => [r.channel_id, Number(r.unread)])), notifications: count ?? 0 };
});

export const myChannels = cache(async (orgId: string) => {
  const db = await supabaseServer();
  const { data } = await db.from('chat_channels').select('*').eq('org_id', orgId).is('archived_at', null)
    .order('last_message_at', { ascending: false, nullsFirst: false }).limit(200);
  return (data as ChatChannel[]) ?? [];
});
