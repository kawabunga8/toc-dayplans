import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.page}>
      <h1>TOC Dayplans</h1>
      <p>
        Staff: Create dayplans for substitute teachers. TOCs: View schedules, select blocks, and print attendance.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link href="/login" style={btn()}>Admin login</Link>
        <Link href="/toc" style={btnOutline()}>View Schedule (Public)</Link>
      </div>

      <hr style={{ margin: '18px 0', opacity: 0.25 }} />

      <h2>How it works</h2>
      <ul>
        <li><strong>Staff:</strong> Create a dayplan for a date (e.g., "Monday, Jan 13 — Block A") and mark it as "Public"</li>
        <li><strong>Staff:</strong> Add schedule blocks with class names, rooms, times, and any special notes</li>
        <li><strong>Staff (Optional):</strong> Link student rosters to blocks for attendance tracking</li>
        <li><strong>TOC:</strong> Visit /toc to see the calendar of published plans</li>
        <li><strong>TOC:</strong> Click a plan to open it, select which blocks apply to them, and print what they need</li>
        <li><strong>TOC:</strong> Expand attendance lists to take attendance and print class rosters</li>
      </ul>

      <hr style={{ margin: '18px 0', opacity: 0.25 }} />

      <h2>Setup</h2>
      <ol>
        <li>Create a Supabase project</li>
        <li>Add env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (and optionally SUPABASE_SERVICE_ROLE_KEY for the server APIs)</li>
        <li>Run the SQL in <code>supabase/schema.sql</code> to create tables + policies</li>
        <li>Add yourself as a staff member in the <code>staff_profiles</code> table</li>
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
