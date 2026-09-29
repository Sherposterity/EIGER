import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { supabase, validateEmail } from '@/lib/supabase';
import { EYEBROW, btnGhost, btnPrimary, btnQuiet, field } from './reviewStyles';

// Sign-in gate for the reviewer pages: email, then the code from the email.
// No passwords and no magic-link redirect (the typed code is the whole flow).
// Anyone can receive a code because the app shares this auth project; the
// reviewer allowlist (reviewer_me) is the real gate and the database enforces
// it on every read and write.

function SignIn() {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const sendCode = async (e) => {
    e.preventDefault();
    const check = validateEmail(email);
    if (!check.valid) {
      setError(check.error);
      return;
    }
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (err) setError(err.message);
    else setStep('code');
  };

  const verify = async (e) => {
    e.preventDefault();
    const token = code.replace(/\s+/g, '');
    if (!/^\d{6,10}$/.test(token)) {
      setError('Enter the code from the email.');
      return;
    }
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token, type: 'email' });
    setBusy(false);
    if (err) setError(err.message);
    // On success the shell hears the auth change and loads the reviewer.
  };

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:py-24">
      <p className={EYEBROW}>Reviewer sign in</p>
      <h1 className="mt-3 font-display text-heading font-semibold text-fg">
        {step === 'email' ? 'Check gear lists for the mountains you know' : 'Check your email'}
      </h1>
      {step === 'email' ? (
        <form onSubmit={sendCode} className="mt-6 flex flex-col gap-3" noValidate>
          <label htmlFor="rv-email" className="text-small text-fg-muted">
            We send a sign-in code to your email. No password.
          </label>
          <input
            id="rv-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={field}
            autoFocus
          />
          <button type="submit" disabled={busy || !email} className={btnPrimary}>
            {busy ? 'Sending' : 'Send code'}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-6 flex flex-col gap-3" noValidate>
          <label htmlFor="rv-code" className="text-small text-fg-muted">
            We sent a code to <span className="text-fg">{email.trim()}</span>. Type it here.
          </label>
          <input
            id="rv-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code"
            className={`${field} font-mono text-lg tracking-[0.3em]`}
            maxLength={12}
            autoFocus
          />
          <button type="submit" disabled={busy || !code} className={btnPrimary}>
            {busy ? 'Checking' : 'Sign in'}
          </button>
          <div className="flex flex-wrap gap-4 pt-1">
            <button type="button" className={btnGhost} onClick={() => { setStep('email'); setCode(''); setError(''); }}>
              Use another email
            </button>
            <button type="button" className={btnGhost} disabled={busy} onClick={sendCode}>
              Send a new code
            </button>
          </div>
        </form>
      )}
      {error ? (
        <p role="alert" className="mt-4 flex gap-2 text-small font-medium text-fg">
          <span aria-hidden="true" className="font-mono">!</span>
          {error}
        </p>
      ) : null}
      <p className="mt-10 text-small text-fg-subtle">
        Not a reviewer yet?{' '}
        <Link to="/review/apply" className={btnGhost}>
          Apply here
        </Link>
      </p>
    </div>
  );
}

function NotAllowed({ email, signOut }) {
  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:py-24">
      <p className={EYEBROW}>Reviewers</p>
      <h1 className="mt-3 font-display text-heading font-semibold text-fg">This page is for approved reviewers</h1>
      <p className="mt-4 text-body text-fg-muted">
        {email ? <>You are signed in as <span className="text-fg">{email}</span>, which is not on the reviewer list. </> : null}
        If you know mountains and want to help check gear lists, apply and we will be in touch.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/review/apply" className={btnPrimary}>
          Apply to review
        </Link>
        <button type="button" onClick={signOut} className={btnQuiet}>
          Sign out
        </button>
      </div>
    </div>
  );
}

// Renders children(ctx) only for a signed-in, allowlisted reviewer.
export default function RequireReviewer({ children, admin = false }) {
  const ctx = useOutletContext();
  const { session, me, loading, signOut } = ctx;
  if (loading) return <div className="px-4 py-24 text-center text-small text-fg-subtle">Loading</div>;
  if (!session) return <SignIn />;
  if (!me) return <NotAllowed email={session.user?.email} signOut={signOut} />;
  if (admin && !me.is_admin) {
    return (
      <div className="mx-auto max-w-sm px-4 py-24 text-center">
        <p className="text-body text-fg-muted">This page is for admins.</p>
        <Link to="/review" className={`${btnQuiet} mt-6`}>
          Back to the board
        </Link>
      </div>
    );
  }
  return children(ctx);
}
