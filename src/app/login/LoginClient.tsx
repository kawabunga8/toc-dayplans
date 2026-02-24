'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';

type Status = 'idle' | 'signing-in' | 'error' | 'sent';

export default function LoginClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next') || '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const resetRedirectTo = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    const url = new URL('/reset-password', window.location.origin);
    url.searchParams.set('next', next);
    return url.toString();
  }, [next]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus('signing-in');
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      router.push(next);
    } catch (err: any) {
      setStatus('error');
      setError(err?.message ?? 'Sign-in failed');
    }
  }

  async function sendReset() {
    setStatus('signing-in');
    setError(null);

    try {
      if (!email.trim()) throw new Error('Enter your email first');
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: resetRedirectTo,
      });
      if (error) throw error;
      setStatus('sent');
    } catch (err: any) {
      setStatus('error');
      setError(err?.message ?? 'Failed to send reset email');
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 520, margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1>Admin Login</h1>
      <p style={{ opacity: 0.8 }}>Sign in with your admin email and password.</p>

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

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Password</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1' }}
          />
        </label>

        <button
          type="submit"
          disabled={status === 'signing-in'}
          style={{ padding: '10px 12px', borderRadius: 10, border: 0, background: '#2563eb', color: 'white' }}
        >
          {status === 'signing-in' ? 'Signing in…' : 'Sign in'}
        </button>

        <button
          type="button"
          onClick={sendReset}
          disabled={status === 'signing-in'}
          style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #94a3b8', background: 'transparent' }}
        >
          Forgot password (email reset link)
        </button>

        {status === 'sent' && (
          <div style={{ padding: 12, borderRadius: 10, border: '1px solid #86efac', background: '#dcfce7' }}>
            Password reset email sent. Check your inbox.
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
