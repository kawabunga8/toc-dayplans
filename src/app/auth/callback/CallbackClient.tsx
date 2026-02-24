'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';

export default function CallbackClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next') || '/admin';

  const [msg, setMsg] = useState('Completing sign-in…');

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const supabase = getSupabaseClient();
        // supabase-js will detect the session in the URL (hash / query) automatically.
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!data.session) {
          setMsg('No session found. Try logging in again.');
          return;
        }

        if (!cancelled) router.replace(next);
      } catch (e: any) {
        setMsg(e?.message ?? 'Sign-in failed. Try again.');
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [next, router]);

  return (
    <main style={{ padding: 24, maxWidth: 720, margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1>Signing in…</h1>
      <p style={{ opacity: 0.8 }}>{msg}</p>
    </main>
  );
}
