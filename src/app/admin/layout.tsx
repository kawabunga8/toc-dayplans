'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { PropsWithChildren, useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';

type GuardState =
  | { status: 'loading' }
  | { status: 'authed' }
  | { status: 'not-logged-in' }
  | { status: 'not-staff' };

export default function AdminLayout({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<GuardState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        if (!cancelled) setState({ status: 'not-logged-in' });
        return;
      }

      // We created `is_staff()` in schema.sql — use it for a clean allow/deny check.
      const { data: isStaff, error } = await supabase.rpc('is_staff');

      if (error) {
        // If RPC permissions get weird, fall back to "deny" rather than accidentally granting.
        if (!cancelled) setState({ status: 'not-staff' });
        return;
      }

      if (!isStaff) {
        if (!cancelled) setState({ status: 'not-staff' });
        return;
      }

      if (!cancelled) setState({ status: 'authed' });
    }

    void check();

    const supabase = getSupabaseClient();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void check();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function logout() {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.push(`/login?next=${encodeURIComponent(pathname || '/admin')}`);
  }

  if (state.status === 'loading') {
    return (
      <main style={{ padding: 24, fontFamily: 'system-ui' }}>
        Checking access…
      </main>
    );
  }

  if (state.status === 'not-logged-in') {
    router.replace(`/login?next=${encodeURIComponent(pathname || '/admin')}`);
    return null;
  }

  if (state.status === 'not-staff') {
    return (
      <main style={{ padding: 24, maxWidth: 900, margin: '0 auto', fontFamily: 'system-ui' }}>
        <h1>Access denied</h1>
        <p style={{ opacity: 0.8 }}>
          This account isn’t enabled as staff in Supabase (<code>staff_profiles</code>).
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
          <Link href="/" style={btnOutline()}>
            Home
          </Link>
          <button onClick={logout} style={btn()}>
            Sign out
          </button>
        </div>
      </main>
    );
  }

  return (
    <div style={{ fontFamily: 'system-ui' }}>
      <header
        style={{
          padding: '12px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/toc" style={{ textDecoration: 'none', color: '#0f172a' }}>
            <b>View Schedule</b>
          </Link>
          <Link href="/admin" style={{ textDecoration: 'none', color: '#2563eb' }}>
            Admin
          </Link>
          <Link href="/admin/dayplans" style={{ textDecoration: 'none', color: '#2563eb' }}>
            Create
          </Link>
          <Link href="/admin/publish" style={{ textDecoration: 'none', color: '#2563eb' }}>
            Publishing
          </Link>
        </div>

        <button onClick={logout} style={btnOutline()}>
          Sign out
        </button>
      </header>

      <main>{children}</main>
    </div>
  );
}

function btn(): React.CSSProperties {
  return {
    padding: '10px 12px',
    borderRadius: 10,
    background: '#2563eb',
    color: 'white',
    textDecoration: 'none',
    border: 0,
  };
}

function btnOutline(): React.CSSProperties {
  return {
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #94a3b8',
    color: '#0f172a',
    background: 'transparent',
    textDecoration: 'none',
  };
}
