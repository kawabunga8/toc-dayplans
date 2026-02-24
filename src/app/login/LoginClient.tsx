'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';

type Status = 'idle' | 'signing-in' | 'error' | 'sent';

const RCS = {
  deepNavy: '#1F4E79',
  midBlue: '#2E75B6',
  lightBlue: '#D6E4F0',
  gold: '#C9A84C',
  white: '#FFFFFF',
  lightGray: '#F5F5F5',
  textDark: '#1A1A1A',
} as const;

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: RCS.white, color: RCS.textDark, fontFamily: 'system-ui' },
  header: { background: RCS.deepNavy, borderBottom: `4px solid ${RCS.gold}`, padding: '18px 24px' },
  brandRow: { maxWidth: 980, margin: '0 auto', display: 'flex', gap: 14, alignItems: 'center', justifyContent: 'space-between' },
  logo: { height: 40, width: 'auto', display: 'block' },
  schoolName: { color: RCS.gold, fontWeight: 900, letterSpacing: 0.2, marginBottom: 4 },
  appName: { color: RCS.white, fontWeight: 900, fontSize: 22 },
  body: { padding: 24 },
  card: { maxWidth: 520, margin: '0 auto', border: `1px solid ${RCS.deepNavy}`, borderRadius: 14, background: RCS.white },
  cardHeader: {
    background: RCS.deepNavy,
    color: RCS.white,
    padding: '10px 12px',
    borderRadius: 12,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottom: `3px solid ${RCS.gold}`,
    fontWeight: 900,
  },
  muted: { margin: 0, padding: 12, opacity: 0.85 },
  label: { color: RCS.midBlue, fontWeight: 800, fontSize: 12 },
  input: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.deepNavy}`, background: RCS.white, color: RCS.textDark },
  primaryBtn: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: RCS.deepNavy, color: RCS.white, cursor: 'pointer', fontWeight: 900 },
  secondaryBtn: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: 'transparent', color: RCS.deepNavy, cursor: 'pointer', fontWeight: 900 },
  successBox: { padding: 12, borderRadius: 10, border: '1px solid #86efac', background: '#dcfce7', marginTop: 6 },
  errorBox: { padding: 12, borderRadius: 10, border: '1px solid #991b1b', background: '#FEE2E2', color: '#7F1D1D', marginTop: 6 },
  backLink: { opacity: 0.9, color: RCS.deepNavy, textDecoration: 'none', fontWeight: 800 },
};

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
    <main style={styles.page}>
      <header style={styles.header}>
        <div style={styles.brandRow}>
          <div>
            <div style={styles.schoolName}>Richmond Christian School</div>
            <div style={styles.appName}>TOC Day Plans</div>
          </div>
          <img src="/rcs-wordmark.png" alt="RCS" style={styles.logo} />
        </div>
      </header>

      <section style={styles.body}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>Admin Login</div>
          <p style={styles.muted}>Sign in with your admin email and password.</p>

          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={styles.label}>Email</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="you@myrcs.ca"
                required
                style={styles.input}
              />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={styles.label}>Password</span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
                style={styles.input}
              />
            </label>

            <button type="submit" disabled={status === 'signing-in'} style={styles.primaryBtn}>
              {status === 'signing-in' ? 'Signing in…' : 'Sign in'}
            </button>

            <button type="button" onClick={sendReset} disabled={status === 'signing-in'} style={styles.secondaryBtn}>
              Forgot password (email reset link)
            </button>

            {status === 'sent' && <div style={styles.successBox}>Password reset email sent. Check your inbox.</div>}

            {status === 'error' && <div style={styles.errorBox}>{error}</div>}
          </form>

          <div style={{ marginTop: 16 }}>
            <Link href="/" style={styles.backLink}>
              ← Back to home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
