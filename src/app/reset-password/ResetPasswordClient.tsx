'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';

export default function ResetPasswordClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next') || '/admin';

  const code = sp.get('code');
  const errorCode = sp.get('error_code');
  const errorDesc = sp.get('error_description');

  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'checking' | 'idle' | 'saving' | 'done' | 'error'>('checking');
  const [error, setError] = useState<string | null>(null);

  const deepLinkError = useMemo(() => {
    if (!errorCode && !errorDesc) return null;
    return `${errorCode ?? 'error'}${errorDesc ? `: ${decodeURIComponent(errorDesc)}` : ''}`;
  }, [errorCode, errorDesc]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const supabase = getSupabaseClient();

        if (deepLinkError) {
          throw new Error(deepLinkError);
        }

        // Newer Supabase recovery links use a ?code=... query param.
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!data.session) {
          throw new Error('No valid recovery session found. Please request a new reset email.');
        }

        if (!cancelled) setStatus('idle');
      } catch (e: any) {
        if (!cancelled) {
          setStatus('error');
          setError(e?.message ?? 'Reset link error. Please request a new reset email.');
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [code, deepLinkError]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus('saving');
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setStatus('done');
      router.replace(next);
    } catch (err: any) {
      setStatus('error');
      setError(err?.message ?? 'Failed to set new password');
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 520, margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1>Set new password</h1>

      {status === 'checking' && <p style={{ opacity: 0.8 }}>Checking reset link…</p>}

      {status === 'error' && (
        <div style={{ padding: 12, borderRadius: 10, border: '1px solid #fecaca', background: '#fee2e2' }}>
          {error}
          <div style={{ marginTop: 8, opacity: 0.8, fontSize: 12 }}>
            Tip: request a new reset email from the login page.
          </div>
        </div>
      )}

      {status !== 'error' && status !== 'checking' && (
        <>
          <p style={{ opacity: 0.8 }}>Enter a new password for your admin account.</p>

          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span>New password</span>
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
              disabled={status === 'saving'}
              style={{ padding: '10px 12px', borderRadius: 10, border: 0, background: '#2563eb', color: 'white' }}
            >
              {status === 'saving' ? 'Saving…' : 'Save password'}
            </button>
          </form>
        </>
      )}

      <div style={{ marginTop: 16 }}>
        <Link href="/login" style={{ opacity: 0.8 }}>
          ← Back to login
        </Link>
      </div>
    </main>
  );
}
