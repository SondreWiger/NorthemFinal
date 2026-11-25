'use client';
import { useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useFormStatus } from 'react-dom';

export interface NavItem { href: string; label: string; icon?: string; count?: number; section?: string }

/** Sidebar links with the current page highlighted. */
export function NavLinks({ items }: { items: NavItem[] }) {
  const path = usePathname();
  let lastSection: string | undefined;
  return (
    <nav className="app-nav" aria-label="Main">
      {items.map((n) => {
        const active = n.href === '/' ? path === '/' : path === n.href || path.startsWith(n.href + '/');
        const head = n.section && n.section !== lastSection ? <span className="app-nav-label">{n.section}</span> : null;
        lastSection = n.section ?? lastSection;
        return (
          <span key={n.href} style={{ display: 'contents' }}>
            {head}
            <a href={n.href} aria-current={active ? 'page' : undefined}>
              <span aria-hidden style={{ width: 18, textAlign: 'center' }}>{n.icon}</span>{n.label}
              {n.count ? <span className="app-count">{n.count}</span> : null}
            </a>
          </span>
        );
      })}
    </nav>
  );
}

/** Mobile: a top bar that opens the sidebar. */
export function MobileBar({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="app-mobilebar">
        <button type="button" onClick={() => setOpen(true)} aria-label="Open menu">☰</button>
        <strong>{title}</strong>
      </div>
      <aside className={`app-side ${open ? 'is-open' : ''}`} onClick={(e) => { if ((e.target as HTMLElement).closest('a')) setOpen(false); }}>
        {children}
      </aside>
      {open ? <div style={{ position: 'fixed', inset: 0, zIndex: 45 }} onClick={() => setOpen(false)} aria-hidden /> : null}
    </>
  );
}

/** Submit button that shows progress while its form's server action runs. */
export function Submit({ children, className = 'btn btn-primary', pendingText = 'Saving…', name, value, disabled }: {
  children: ReactNode; className?: string; pendingText?: string; name?: string; value?: string; disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return <button type="submit" className={className} disabled={pending || disabled} name={name} value={value}>{pending ? pendingText : children}</button>;
}

/** A destructive submit that asks for a second click instead of a browser dialog. */
export function ConfirmSubmit({ children, confirm = 'Click again to confirm', className = 'btn btn-danger btn-sm' }: { children: ReactNode; confirm?: string; className?: string }) {
  const [armed, setArmed] = useState(false);
  const { pending } = useFormStatus();
  if (!armed) return <button type="button" className={className} onClick={() => { setArmed(true); setTimeout(() => setArmed(false), 4000); }}>{children}</button>;
  return <button type="submit" className={className} disabled={pending} style={{ borderColor: 'var(--bad)' }}>{pending ? '…' : confirm}</button>;
}
