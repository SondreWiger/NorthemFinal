'use client';
import { useActionState, useState } from 'react';
import { authAction, resetPassword, type AuthState } from './auth-actions';

export function LoginForm({ next, email: initialEmail, allowSignup = true }: { next: string; email?: string; allowSignup?: boolean }) {
  const [mode, setMode] = useState<'password' | 'magic' | 'signup'>('password');
  const [state, run, pending] = useActionState<AuthState | null, FormData>(authAction, null);
  const [reset, runReset] = useActionState<AuthState | null, FormData>(resetPassword, null);
  const msg = reset?.message ? reset : state;
  return (
    <form action={run} className="stack">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="mode" value={mode} />
      <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required defaultValue={initialEmail} /></div>
      {mode !== 'magic' ? (
        <div className="field"><label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required minLength={mode === 'signup' ? 8 : undefined} />
        </div>
      ) : null}
      {msg?.message ? <div className={`notice ${msg.ok ? 'notice-ok' : 'notice-bad'}`} role="status">{msg.message}</div> : null}
      <button className="btn btn-primary" disabled={pending}>
        {pending ? 'One moment…' : mode === 'magic' ? 'Email me a sign-in link' : mode === 'signup' ? 'Create account' : 'Sign in'}
      </button>
      <div className="divider">or</div>
      <div className="row" style={{ justifyContent: 'center' }}>
        {mode !== 'magic' ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMode('magic')}>Use a magic link</button> : <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMode('password')}>Use a password</button>}
        {allowSignup && mode !== 'signup' ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMode('signup')}>Create an account</button> : null}
        {mode === 'password' ? <button type="submit" formAction={runReset} formNoValidate className="btn btn-ghost btn-sm">Forgot password</button> : null}
      </div>
    </form>
  );
}
