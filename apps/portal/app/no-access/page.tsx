import { NorthemMark } from '@northem/ui/micro';
import { getSession } from '@northem/core/session';

export default async function NoAccess() {
  const s = await getSession();
  return (
    <main className="auth">
      <div className="auth-card">
        <div className="auth-brand"><NorthemMark />{s?.org.name ?? 'Northem'}</div>
        <h1>{s ? 'Not quite yet' : 'Sign in first'}</h1>
        {s ? (
          <>
            <p className="muted" style={{ margin: 0 }}>You&apos;re signed in as <strong>{s.email}</strong>, but {s.role ? "your role doesn't include this page" : "you haven't been added to a team yet"}. Ask the person you work with to add you, or use the invite link from your mail.</p>
            <p className="muted" style={{ margin: 0 }}>Meanwhile you can <a href="/me">set up your profile</a>.</p>
          </>
        ) : <p className="muted">Please sign in to continue.</p>}
        <div className="row"><a className="btn" href="/">Try again</a>{s ? <form action="/auth/signout" method="post"><button className="btn btn-ghost">Sign out</button></form> : <a className="btn btn-primary" href="/login">Sign in</a>}</div>
      </div>
    </main>
  );
}
