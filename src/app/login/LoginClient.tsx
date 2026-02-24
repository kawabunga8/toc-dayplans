'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';

export default function LoginClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next') || '/admin';

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const redirectTo = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    const url = new URL('/auth/callback', window.location.origin);
    url.searchParams.set('next', next);
    return url.toString();
  }, [next]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) throw error;
      setStatus('sent');
    } catch (err: any) {
      setStatus('error');
      setError(err?.message ?? 'Failed to send magic link');
    }
  }

  async function goIfAlreadyLoggedIn() {
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    if (data.session) router.push(next);
  }

  // best-effort: if already logged in, bounce.
  if (typeof window !== 'undefined') {
    // fire and forget
    void goIfAlreadyLoggedIn();
  }

  return (
    <main style={{ padding: 24, maxWidth: 520, margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1>Staff Login</h1>
      <p style={{ opacity: 0.8 }}>
        Enter your staff email and we’ll send you a sign-in link.
      </p>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="you@myrcs.ca"
            required
            style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1' }}
          />
        </label>

        <button
          type="submit"
          disabled={status === 'sending'}
          style={{ padding: '10px 12px', borderRadius: 10, border: 0, background: '#2563eb', color: 'white' }}
        >
          {status === 'sending' ? 'Sending…' : 'Send magic link'}
        </button>

        {status === 'sent' && (
          <div style={{ padding: 12, borderRadius: 10, border: '1px solid #86efac', background: '#dcfce7' }}>
            Link sent. Check your inbox.
          </div>
        )}

        {status === 'error' && (
          <div style={{ padding: 12, borderRadius: 10, border: '1px solid #fecaca', background: '#fee2e2' }}>
            {error}
          </div>
        )}
      </form>

      <div style={{ marginTop: 16 }}>
        <Link href="/" style={{ opacity: 0.8 }}>
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
