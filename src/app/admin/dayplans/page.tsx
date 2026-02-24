// Placeholder list page. Next step: list dayplans from Supabase.

import Link from 'next/link';

export default function DayPlansPage() {
  return (
    <main style={{ padding: 24, maxWidth: 900, margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1>Dayplans</h1>
      <p style={{ opacity: 0.8 }}>
        This will list plans from Supabase and allow create/edit.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link href="/admin" style={btnOutline()}>Back</Link>
      </div>

      <hr style={{ margin: '18px 0', opacity: 0.25 }} />

      <div style={{ border: '1px solid #cbd5e1', borderRadius: 12, padding: 16 }}>
        <b>Example</b>
        <div>2026-02-24 — Mr. Kawamura Dayplan</div>
      </div>
    </main>
  );
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
