'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { PropsWithChildren, useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { DemoProvider } from './DemoContext';

type GuardState =
  | { status: 'loading' }
  | { status: 'authed'; role: string | null; email: string | null }
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

      // role is optional (and the RPC may not exist); skip to avoid noisy 404s in console.
      const role: string | null = null;

      const email = (data.session.user?.email as string | undefined) ?? null;

      if (!cancelled) setState({ status: 'authed', role, email });
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
            <Link href="/admin" style={{ textDecoration: 'none', color: '#1F4E79' }}>
              <b>Admin</b>
            </Link>
            <span style={disabledNav()}>Dayplans</span>
            <span style={disabledNav()}>Block times</span>
            <span style={disabledNav()}>Courses/Rooms</span>
            <span style={disabledNav()}>Class lists</span>
            <span style={disabledNav()}>Publishing</span>
            <span style={disabledNav()}>Policies</span>
          </div>

          <button onClick={logout} style={btnOutline()}>
            Sign out
          </button>
        </header>

        <main style={{ padding: 24, maxWidth: 900, margin: '0 auto', fontFamily: 'system-ui' }}>
          <h1>Access denied</h1>
          <p style={{ opacity: 0.8 }}>
            This account isn’t enabled as staff in Supabase (<code>staff_profiles</code>).
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
            <Link href="/" style={btnOutline()}>
              Home
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const role = state.status === 'authed' ? state.role : null;
  const email = state.status === 'authed' ? state.email : null;
  const isDemo = role === 'demo';

  return (
    <DemoProvider value={{ isDemo, role }}>
      <div style={{ fontFamily: 'system-ui' }}>
        <header
          style={{
            padding: '12px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link href="/admin" style={{ textDecoration: 'none', color: '#1F4E79' }}>
              <b>Admin</b>
            </Link>
            <Link href="/admin/dayplans" style={navLink('/admin/dayplans', pathname)}>
              Dayplans
            </Link>
            <Link href="/admin/block-times" style={navLink('/admin/block-times', pathname)}>
              Block times
            </Link>
            <Link href="/admin/courses" style={navLink('/admin/courses', pathname)}>
              Courses/Rooms
            </Link>
            <Link href="/admin/class-lists" style={navLink('/admin/class-lists', pathname)}>
              Class lists
            </Link>
            <Link href="/admin/publishing" style={navLink('/admin/publishing', pathname)}>
              Publishing
            </Link>
            <Link href="/admin/policies" style={navLink('/admin/policies', pathname)}>
              Policies
            </Link>
            <Link href="/toc" style={{ textDecoration: 'none', color: '#1F4E79', fontWeight: 800 }}>
              TOC view
            </Link>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {email ? (
              <div style={{ fontSize: 12, fontWeight: 900, color: '#1F4E79', opacity: 0.9 }}>
                {email}
              </div>
            ) : null}
            {isDemo ? (
              <div
                style={{
                  padding: '6px 10px',
                  borderRadius: 999,
                  border: '1px solid #C9A84C',
                  background: '#FFF7ED',
                  color: '#7c2d12',
                  fontWeight: 900,
                  fontSize: 12,
                }}
              >
                DEMO MODE — changes are disabled
              </div>
            ) : null}
            <button onClick={logout} style={btnOutline()}>
              Sign out
            </button>
          </div>
        </header>

        <main style={isDemo ? { filter: 'grayscale(0.35)', opacity: 0.92 } : undefined}>{children}</main>
      </div>
    </DemoProvider>
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

function navLink(href: string, pathname: string | null): React.CSSProperties {
  const active = pathname?.startsWith(href);
  return {
    textDecoration: 'none',
    color: active ? '#C9A84C' : '#1F4E79',
    fontWeight: active ? 900 : 800,
  };
}

function disabledNav(): React.CSSProperties {
  return {
    color: '#94a3b8',
    fontWeight: 600,
  };
}

function btnOutline(): React.CSSProperties {
  return {
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #C9A84C',
    color: '#1F4E79',
    background: '#FFFFFF',
    textDecoration: 'none',
    fontWeight: 900,
  };
}
