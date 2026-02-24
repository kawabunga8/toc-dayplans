import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ padding: 24, maxWidth: 900, margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1>TOC Dayplans</h1>
      <p>
        Create dayplans for TOCs. Share a print-friendly link that expires end-of-day.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link href="/admin" style={btn()}>Admin</Link>
        <Link href="/p/demo" style={btnOutline()}>Sample public plan link (demo)</Link>
      </div>

      <hr style={{ margin: '18px 0', opacity: 0.25 }} />

      <h2>Next steps</h2>
      <ol>
        <li>Create a Supabase project</li>
        <li>Add env vars in Vercel: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
        <li>Run the SQL in <code>supabase/schema.sql</code> to create tables + policies</li>
      </ol>
    </main>
  );
}

function btn(): React.CSSProperties {
  return {
    padding: '10px 12px',
    borderRadius: 10,
    background: '#2563eb',
    color: 'white',
    textDecoration: 'none',
  };
}

function btnOutline(): React.CSSProperties {
  return {
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #94a3b8',
    color: '#0f172a',
    textDecoration: 'none',
  };
}
