'use client';

import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';

export default function ResetPasswordClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next') || '/admin';

  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

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
      <p style={{ opacity: 0.8 }}>
        Enter a new password for your admin account.
      </p>

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

        {status === 'error' && (
          <div style={{ padding: 12, borderRadius: 10, border: '1px solid #fecaca', background: '#fee2e2' }}>
            {error}
          </div>
        )}
      </form>

      <div style={{ marginTop: 16 }}>
        <Link href="/login" style={{ opacity: 0.8 }}>
          ← Back to login
        </Link>
      </div>
    </main>
  );
}
