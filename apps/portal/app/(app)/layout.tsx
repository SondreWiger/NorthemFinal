import { redirect } from 'next/navigation';
import { getSession } from '@northem/core/session';
import { env, hasSupabase } from '@northem/core/env';
import { ORG_ROLE_LABEL } from '@northem/core/roles';
import { AppShell, type NavItem } from '@northem/ui/app';
import { unreadCounts } from '@/data';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!hasSupabase) redirect('/login');
  const s = await getSession();
  if (!s) redirect('/login');
  const counts = s.role ? await unreadCounts() : { chat: 0, notifications: 0 };
  const nav: NavItem[] = s.role ? [
    { href: '/', label: 'Home', icon: '⌂' },
    { href: '/projects', label: 'Projects', icon: '▦' },
    { href: '/chat', label: 'Chat', icon: '✉', count: counts.chat },
    { href: '/people', label: 'People', icon: '☺' },
    { href: '/notifications', label: 'Notifications', icon: '◔', count: counts.notifications },
    ...(s.atLeast('press') ? [{ href: '/press', label: 'Press room', icon: '✎' }] : []),
    { href: '/me', label: 'My profile', icon: '◐', section: 'You' },
    ...(s.atLeast('producer') || s.perms.size > 1 ? [{ href: env.adminUrl, label: 'Admin', icon: '⚙' }] : []),
  ] : [{ href: '/me', label: 'My profile', icon: '◐' }];
  return (
    <AppShell
      brand={s.org.branding?.product_name ?? `${s.org.name} Portal`}
      product={s.org.name}
      accent={s.org.branding?.accent}
      logoUrl={s.org.branding?.logo_url}
      nav={nav}
      me={{ name: s.profile.display_name || s.email, sub: s.role ? ORG_ROLE_LABEL[s.role] : 'No team yet', avatar: s.profile.avatar_url, href: '/me' }}
    >
      {children}
    </AppShell>
  );
}
