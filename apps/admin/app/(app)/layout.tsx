import { redirect } from 'next/navigation';
import { env, hasSupabase } from '@northem/core/env';
import { ORG_ROLE_LABEL } from '@northem/core/roles';
import { supabaseServer } from '@northem/core/supabase/server';
import { AppShell, type NavItem } from '@northem/ui/app';
import { requireAdmin } from '@/guard';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!hasSupabase) redirect('/login');
  const s = await requireAdmin();
  let inbox = 0;
  if (s.can('forms.read')) {
    const db = await supabaseServer();
    const { count } = await db.from('submissions').select('id', { count: 'exact', head: true }).eq('org_id', s.org.id).eq('status', 'new');
    inbox = count ?? 0;
  }
  const nav: NavItem[] = [
    { href: '/', label: 'Overview', icon: '⌂' },
    ...(s.can('forms.read') ? [{ href: '/inbox', label: 'Inbox', icon: '✉', count: inbox }] : []),
    { href: '/projects', label: 'Projects', icon: '▦', section: 'Work' },
    ...(s.can('people.manage') || s.can('projects.create') ? [{ href: '/credits', label: 'Credits & people pages', icon: '★' }] : []),
    ...(s.can('podcasts.publish') ? [{ href: '/podcasts', label: 'Podcasts', icon: '◉' }] : []),
    ...(s.can('openings.manage') ? [{ href: '/openings', label: 'Jobs & casting', icon: '✚' }] : []),
    ...(s.can('sites.edit') ? [{ href: '/press', label: 'Press kits', icon: '✎' }, { href: '/themes', label: 'Themes', icon: '◐' }] : []),
    ...(s.can('people.invite') || s.can('people.manage') ? [{ href: '/team', label: 'Team & invites', icon: '☺', section: 'Organisation' }] : []),
    ...(s.atLeast('owner') ? [{ href: '/roles', label: 'Roles & permissions', icon: '⚿' }] : []),
    ...(s.can('sites.edit') || s.atLeast('admin') ? [{ href: '/settings', label: 'Divisions & branding', icon: '⚙' }] : []),
    ...(s.can('audit.read') ? [{ href: '/audit', label: 'Audit log', icon: '☰' }] : []),
    { href: env.portalUrl, label: 'Back to portal', icon: '↩', section: 'Elsewhere' },
    { href: env.siteUrl, label: 'Public site', icon: '↗' },
  ];
  return (
    <AppShell
      brand={`${s.org.name} Admin`}
      product={s.org.branding?.product_name ?? 'Control room'}
      accent={s.org.branding?.accent}
      logoUrl={s.org.branding?.logo_url}
      nav={nav}
      me={{ name: s.profile.display_name || s.email, sub: ORG_ROLE_LABEL[s.role], avatar: s.profile.avatar_url, href: `${env.portalUrl}/me` }}
    >
      {children}
    </AppShell>
  );
}
