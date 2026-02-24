// Public, print-friendly dayplan route.
// In production this will look up the token in Supabase and enforce expiry.

export default async function PublicPlanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1>Dayplan (Public Link)</h1>
      <p style={{ opacity: 0.8 }}>Token: {token}</p>

      <div style={{ border: '1px solid #cbd5e1', borderRadius: 12, padding: 16 }}>
        <h2>Demo Plan</h2>
        <p>
          This is a placeholder. Next step: fetch a real plan from Supabase by token, and 404 if expired.
        </p>

        <h3>Schedule</h3>
        <ul>
          <li>08:30–09:45 • Room 101 • Block A</li>
          <li>10:00–11:15 • Room 101 • Block B</li>
        </ul>

        <h3>Notes</h3>
        <p>Emergency procedures, attendance notes, etc.</p>

        <button onClick={() => window.print()} style={{ padding: '8px 10px', borderRadius: 10 }}>
          Print
        </button>
      </div>

      <style>{`
        @media print {
          button { display: none; }
        }
      `}</style>
    </main>
  );
}
