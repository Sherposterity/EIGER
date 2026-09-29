import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { reviewerMe } from '@/lib/reviewApi';
import { focusRing } from './reviewStyles';

// Layout for every /review route: keeps the portal out of search engines,
// owns the auth session and the reviewer profile, and a single toast line.
// The portal is not linked from the site nav or footer on purpose.

function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
}

export default function ReviewShell() {
  useNoIndex();
  // session: undefined while loading, null when signed out.
  const [session, setSession] = useState(undefined);
  // me: undefined while loading, null when not on the allowlist.
  const [me, setMe] = useState(undefined);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((message, tone = 'error') => {
    setToast({ message, tone, id: Date.now() });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), tone === 'error' ? 7000 : 3500);
  }, []);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setSession(data.session ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      // Token refreshes fire here too; only react to a change of user.
      setSession((prev) => (prev?.user?.id === s?.user?.id && prev !== undefined ? prev : s ?? null));
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user?.id;
  useEffect(() => {
    if (session === undefined) return undefined;
    let alive = true;
    if (!userId) {
      Promise.resolve().then(() => alive && setMe(null));
      return () => {
        alive = false;
      };
    }
    reviewerMe()
      .then((r) => alive && setMe(r ?? null))
      .catch((e) => {
        if (!alive) return;
        setMe(null);
        showToast(e.message);
      });
    return () => {
      alive = false;
    };
  }, [session, userId, showToast]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setMe(null);
  }, []);

  const ctx = { session, me, loading: session === undefined || (session && me === undefined), signOut, toast: showToast };

  return (
    <div className="min-h-screen overflow-x-clip bg-bg text-fg">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" className={`rounded-sm font-display text-xl font-bold tracking-tight text-fg ${focusRing}`}>
            EIGER
          </Link>
          <span className="font-mono text-eyebrow font-semibold uppercase text-fg-subtle">Reviewers</span>
        </div>
      </header>
      <Outlet context={ctx} />
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
        {toast ? (
          <div
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex max-w-md items-start gap-3 rounded-md border border-line-strong bg-surface-3 px-4 py-3 text-small text-fg shadow-lg"
          >
            <span aria-hidden="true" className="font-mono">{toast.tone === 'error' ? '!' : '✓'}</span>
            <span className="flex-1">{toast.message}</span>
            <button type="button" onClick={() => setToast(null)} className={`rounded-sm text-fg-subtle hover:text-fg ${focusRing}`} aria-label="Dismiss">
              ✕
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
