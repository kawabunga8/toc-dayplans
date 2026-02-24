import Link from 'next/link';

export default function AdminHome() {
  return (
    <main style={{ padding: 24, maxWidth: 900, margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1>Admin</h1>
      <p>
        Staff-only area (Supabase Auth). This will show a list of dayplans and allow create/edit.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link href="/admin/dayplans" style={btn()}>Dayplans</Link>
        <Link href="/" style={btnOutline()}>Home</Link>
      </div>

      <hr style={{ margin: '18px 0', opacity: 0.25 }} />

      <h2>MVP features to implement</h2>
      <ul>
        <li>Staff login (magic link or Google)</li>
        <li>Create dayplan for a date</li>
        <li>Add blocks (time, room, class)</li>
        <li>Attach student roster with photos</li>
        <li>Generate expiring public link for TOC</li>
      </ul>
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
