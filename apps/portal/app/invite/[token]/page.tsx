import type { Metadata } from 'next';
import { NorthemMark } from '@northem/ui/micro';
import { supabaseServer } from '@northem/core/supabase/server';
import { hasSupabase } from '@northem/core/env';
import { ORG_ROLE_LABEL, PROJECT_ROLE_LABEL } from '@northem/core/roles';
import type { OrgRole, ProjectRole } from '@northem/core/types';
import { dateLabel } from '@northem/core/format';
import { Submit } from '@northem/ui/app';
import { LoginForm } from '@/login-form';
import { acceptInvite } from './actions';

export const metadata: Metadata = { title: 'Your invite' };

interface Preview { org: string; project: string | null; project_role: ProjectRole | null; org_role: OrgRole; title: string | null; message: string | null; invited_by: string | null; email: string; person: string | null; expires_at: string }

export default async function Invite(props: PageProps<'/invite/[token]'>) {
  const { token } = await props.params;
  const sp = await props.searchParams;
  if (!hasSupabase) return <main className="auth"><div className="auth-card"><h1>Not configured</h1></div></main>;
  const supabase = await supabaseServer();
  const [{ data }, { data: auth }] = await Promise.all([supabase.rpc('invite_preview', { p_token: token }), supabase.auth.getUser()]);
  const inv = data as Preview | null;
  const user = auth.user;
  const here = `/invite/${token}`;

  return (
    <main className="auth">
      <div className="auth-card">
        <div className="auth-brand"><NorthemMark />{inv?.org ?? 'Northem'}</div>
        {!inv ? (
          <>
            <h1>This invite has expired</h1>
            <p className="muted" style={{ margin: 0 }}>It may have been used already, revoked, or it&apos;s older than 14 days. Ask the person who invited you to send a new one.</p>
            <a className="btn" href="/login">Go to sign in</a>
          </>
        ) : (
          <>
            <h1>{inv.project ? `Join ${inv.project}` : `Join ${inv.org}`}</h1>
            <p className="muted" style={{ margin: 0 }}>
              {inv.invited_by ?? 'Someone'} invited <strong>{inv.email}</strong> as {inv.project_role ? PROJECT_ROLE_LABEL[inv.project_role] : ORG_ROLE_LABEL[inv.org_role]}
              {inv.title ? ` (${inv.title})` : ''}.{inv.person ? ` You'll be linked to the credits for ${inv.person}.` : ''}
            </p>
            {inv.message ? <blockquote className="notice" style={{ margin: 0 }}>“{inv.message}”</blockquote> : null}
            <small className="faint">Expires {dateLabel(inv.expires_at)}</small>
            {typeof sp.error === 'string' ? <div className="notice notice-bad">{sp.error}</div> : null}
            {user ? (
              user.email?.toLowerCase() === inv.email.toLowerCase() ? (
                <form action={acceptInvite}>
                  <input type="hidden" name="token" value={token} />
                  <Submit pendingText="Joining…">Accept and continue</Submit>
                </form>
              ) : (
                <div className="stack">
                  <div className="notice notice-bad">You&apos;re signed in as {user.email}. This invite is for {inv.email}.</div>
                  <form action="/auth/signout" method="post"><button className="btn">Sign out and switch account</button></form>
                </div>
              )
            ) : (
              <>
                <p className="small muted" style={{ margin: 0 }}>Create your account with this address (or sign in if you already have one). You&apos;ll set up your profile next.</p>
                <LoginForm next={here} email={inv.email} />
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
