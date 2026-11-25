import 'server-only';
import { supabaseAdmin, hasServiceRole } from './supabase/admin';
import { decrypt, encrypt } from './crypto';
import { serverEnv } from './env';

// Screenplay Studio and Graphite live in their own Supabase projects. We talk
// to their MCP endpoints (JSON-RPC over HTTP) with the person's own personal
// access token, so the portal never shows more than they could see there.

export type Provider = 'screenplay_studio' | 'graphite';

export const PROVIDERS: Record<Provider, { name: string; tokenHelp: string; base: () => string }> = {
  screenplay_studio: { name: 'Screenplay Studio', tokenHelp: 'Screenplay Studio → Settings → Claude & MCP → New token (starts with sps_)', base: () => serverEnv().spsBaseUrl },
  graphite: { name: 'Graphite', tokenHelp: 'Graphite → Settings → AI connections → Personal token', base: () => serverEnv().graphiteBaseUrl },
};

export class IntegrationError extends Error {}

export async function callTool<T = unknown>(provider: Provider, token: string, name: string, args: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`${PROVIDERS[provider].base()}/api/mcp`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method: 'tools/call', params: { name, arguments: args } }),
    cache: 'no-store',
  });
  if (res.status === 401 || res.status === 403) throw new IntegrationError(`${PROVIDERS[provider].name} rejected the token. Reconnect it in your profile.`);
  if (!res.ok) throw new IntegrationError(`${PROVIDERS[provider].name} answered ${res.status}.`);
  const body = (await res.json()) as { result?: { content?: { type: string; text: string }[]; isError?: boolean }; error?: { message: string } };
  if (body.error) throw new IntegrationError(body.error.message);
  const text = body.result?.content?.find((c) => c.type === 'text')?.text ?? '';
  if (body.result?.isError) throw new IntegrationError(text || 'The tool failed.');
  try { return JSON.parse(text) as T; } catch { return text as unknown as T; }
}

export async function saveConnection(userId: string, provider: Provider, token: string) {
  // Check the token works before storing it.
  const who = await callTool<Record<string, unknown> | string>(provider, token, provider === 'screenplay_studio' ? 'whoami' : 'list_workspaces');
  const label = typeof who === 'object' && who ? String((who as { email?: string; name?: string }).email ?? (who as { name?: string }).name ?? '') : '';
  const { error } = await supabaseAdmin().from('user_connections').upsert({
    user_id: userId, provider, token_ciphertext: encrypt(token), external_user_label: label || null, last_used_at: new Date().toISOString(),
  });
  if (error) throw new IntegrationError('Could not save the connection.');
}

export async function removeConnection(userId: string, provider: Provider) {
  await supabaseAdmin().from('user_connections').delete().eq('user_id', userId).eq('provider', provider);
}

export async function listConnections(userId: string): Promise<{ provider: Provider; external_user_label: string | null; created_at: string }[]> {
  if (!hasServiceRole()) return [];
  const { data } = await supabaseAdmin().from('user_connections').select('provider, external_user_label, created_at').eq('user_id', userId);
  return (data as { provider: Provider; external_user_label: string | null; created_at: string }[]) ?? [];
}

async function tokenFor(userId: string, provider: Provider): Promise<string | null> {
  if (!hasServiceRole() || !serverEnv().encKey) return null;
  const { data } = await supabaseAdmin().from('user_connections').select('token_ciphertext').eq('user_id', userId).eq('provider', provider).maybeSingle();
  const sealed = (data as { token_ciphertext: string } | null)?.token_ciphertext;
  if (!sealed) return null;
  try { return decrypt(sealed); } catch { return null; }
}

/** Call a tool as this user, or return null when they haven't connected. */
export async function asUser<T>(userId: string, provider: Provider, name: string, args: Record<string, unknown> = {}): Promise<T | null> {
  const token = await tokenFor(userId, provider);
  if (!token) return null;
  return callTool<T>(provider, token, name, args);
}

export interface SpsProject { id: string; title: string; role?: string; format?: string; status?: string; updated_at?: string }
export interface SpsScript { id: string; title: string; version?: number; revision_color?: string; updated_at?: string; scenes?: number }

function arr<T>(x: unknown, key: string): T[] {
  if (Array.isArray(x)) return x as T[];
  if (x && typeof x === 'object' && Array.isArray((x as Record<string, unknown>)[key])) return (x as Record<string, T[]>)[key];
  return [];
}

export const sps = {
  projects: async (uid: string) => { const r = await asUser<unknown>(uid, 'screenplay_studio', 'list_projects'); return r === null ? null : arr<SpsProject>(r, 'projects'); },
  scripts: async (uid: string, projectId: string) => { const r = await asUser<unknown>(uid, 'screenplay_studio', 'list_scripts', { project_id: projectId }); return r === null ? null : arr<SpsScript>(r, 'scripts'); },
  readScript: (uid: string, scriptId: string) => asUser<unknown>(uid, 'screenplay_studio', 'read_script', { script_id: scriptId }),
  records: async (uid: string, projectId: string, kind: string) => { const r = await asUser<unknown>(uid, 'screenplay_studio', 'list_records', { project_id: projectId, kind }); return r === null ? null : arr<Record<string, unknown>>(r, 'records'); },
};

export const graphite = {
  pages: (uid: string, workspaceId?: string, parentPageId?: string) =>
    asUser<unknown>(uid, 'graphite', 'list_pages', { ...(workspaceId ? { workspace_id: workspaceId } : {}), ...(parentPageId ? { parent_page_id: parentPageId } : {}) }),
  page: (uid: string, pageId: string) => asUser<unknown>(uid, 'graphite', 'get_page', { page_id: pageId }),
  query: (uid: string, databasePageId: string) => asUser<unknown>(uid, 'graphite', 'query_database', { database_page_id: databasePageId }),
};

/** Pull checklist items ("- [ ] thing" or to_do blocks) out of whatever get_page returns. */
export function extractTodos(page: unknown): { text: string; done: boolean }[] {
  const out: { text: string; done: boolean }[] = [];
  const walk = (x: unknown) => {
    if (typeof x === 'string') {
      for (const line of x.split('\n')) {
        const m = line.match(/^\s*[-*]\s*\[( |x|X)\]\s+(.*)$/);
        if (m) out.push({ done: m[1] !== ' ', text: m[2]! });
      }
    } else if (Array.isArray(x)) x.forEach(walk);
    else if (x && typeof x === 'object') {
      const o = x as Record<string, unknown>;
      if ((o.type === 'to_do' || o.type === 'todo') && o.content && typeof o.content === 'object') {
        const c = o.content as Record<string, unknown>;
        out.push({ text: String(c.text ?? c.plain ?? c.title ?? ''), done: Boolean(c.checked ?? c.done) });
      }
      for (const v of Object.values(o)) walk(v);
    }
  };
  walk(page);
  return out.filter((t) => t.text);
}
