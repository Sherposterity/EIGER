import { useEffect, useId, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { FadeIn } from './motion';
import { focusRing } from './utils';

// "Be the first to get updates". Same backend path as the old Waitlist:
// lib/supabase.js addToWaitlist (validation, client rate limit, duplicate
// handling), plus the hidden honeypot field bots fill in. Without
// VITE_SUPABASE_* (local dev) the insert fails closed and the error shows.
// The Supabase client is loaded on first submit, not with the page, which
// keeps it out of the home bundle.
const loadWaitlist = () => import('@/lib/supabase');
const EmailCapture = () => {
  const inputId = useId();
  const [email, setEmail] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | done
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const successRef = useRef(null);

  useEffect(() => {
    if (status === 'done') successRef.current?.focus();
  }, [status]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (status === 'loading') return;
    if (!email.trim()) {
      setError('Please enter an email address.');
      inputRef.current?.focus();
      return;
    }

    let waitlist;
    try {
      waitlist = await loadWaitlist();
    } catch {
      setError('Connection error. Please try again.');
      inputRef.current?.focus();
      return;
    }

    const rateCheck = waitlist.checkRateLimit();
    if (!rateCheck.allowed) {
      setError('Too many attempts. Please try again later.');
      inputRef.current?.focus();
      return;
    }

    setStatus('loading');
    setError('');
    const result = await waitlist.addToWaitlist(email, honeypot);

    if (result.success) {
      setStatus('done');
      setEmail('');
      setHoneypot('');
    } else {
      setStatus('idle');
      setError(result.error || 'Something went wrong. Please try again.');
      inputRef.current?.focus();
    }
  };

  return (
    <section
      id="updates"
      aria-labelledby="updates-heading"
      className="scroll-mt-16 border-t border-line bg-bg py-section"
    >
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <div>
          <FadeIn>
            <h2 id="updates-heading" className="font-display text-display-lg text-balance text-fg">
              Be the first to get updates
            </h2>
          </FadeIn>
          <FadeIn delay={0.06}>
            <p className="mt-5 max-w-xl text-body-lg text-fg-muted">
              You&apos;ll be notified to updates in our mountain catalog and new features!
            </p>
          </FadeIn>
        </div>

        {/* The form itself is not animated: it is there from the first frame. */}
        <div className="lg:pt-3" aria-live="polite">
          {status === 'done' ? (
            <p
              ref={successRef}
              tabIndex={-1}
              className="flex items-center gap-3 rounded-lg border border-line-strong bg-surface-1 px-6 py-5 text-heading font-display text-fg outline-none"
            >
              <Check aria-hidden="true" className="size-6 shrink-0" />
              You&apos;re on the list!
            </p>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              {/* Honeypot: hidden from people and assistive tech; bots fill it. */}
              <input
                type="text"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="pointer-events-none absolute -left-[9999px] size-0 opacity-0"
              />

              <Field data-invalid={error ? 'true' : undefined} className="gap-2">
                <FieldLabel htmlFor={inputId} className="text-small text-fg-muted">
                  Email address
                </FieldLabel>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    ref={inputRef}
                    id={inputId}
                    type="email"
                    name="email"
                    inputMode="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                    aria-invalid={error ? 'true' : undefined}
                    aria-describedby={`${inputId}-privacy${error ? ` ${inputId}-error` : ''}`}
                    className="h-12 w-full rounded-pill sm:flex-1 border-line-strong bg-surface-1 px-5 text-body text-fg md:text-body"
                  />
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    aria-busy={status === 'loading'}
                    className={`inline-flex h-12 items-center justify-center rounded-pill bg-fg px-7 text-body font-semibold text-bg transition-colors hover:bg-fg/85 disabled:cursor-wait disabled:opacity-60 ${focusRing}`}
                  >
                    Sign up
                  </button>
                </div>
                {error ? (
                  <FieldError id={`${inputId}-error`} className="text-small">
                    {error}
                  </FieldError>
                ) : null}
                <FieldDescription id={`${inputId}-privacy`} className="text-small text-fg-subtle">
                  You will never be subject to spam. Updates on the App only.
                </FieldDescription>
              </Field>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default EmailCapture;
