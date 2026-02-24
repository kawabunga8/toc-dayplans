import Link from 'next/link';

export default function AdminHome() {
  return (
    <main style={styles.page}>
      <h1 style={styles.h1}>Admin</h1>
      <p style={styles.muted}>Staff-only tools for building and publishing TOC day plans.</p>

      <section style={styles.card}>
        <div style={styles.sectionHeader}>Quick links</div>
        <div style={styles.grid}>
          <Link href="/admin/dayplans" style={styles.tile}>
            <div style={styles.tileTitle}>Dayplans</div>
            <div style={styles.tileText}>Create plans and publish TOC links.</div>
          </Link>

          <Link href="/admin/courses" style={styles.tile}>
            <div style={styles.tileTitle}>Courses / Rooms</div>
            <div style={styles.tileText}>Block list and TOC templates per class.</div>
          </Link>

          <Link href="/admin/publishing" style={styles.tile}>
            <div style={styles.tileTitle}>Publishing</div>
            <div style={styles.tileText}>See all published plans and revoke links.</div>
          </Link>

          <Link href="/admin/block-times" style={styles.tile}>
            <div style={styles.tileTitle}>Block times</div>
            <div style={styles.tileText}>Set default bell schedule times.</div>
          </Link>

          <Link href="/admin/class-lists" style={styles.tile}>
            <div style={styles.tileTitle}>Class lists</div>
            <div style={styles.tileText}>Rosters and student photos (coming).</div>
          </Link>
        </div>
      </section>

      <div style={{ marginTop: 14 }}>
        <Link href="/" style={styles.secondaryLink}>
          ← Back to home
        </Link>
      </div>
    </main>
  );
}

const RCS = {
  deepNavy: '#1F4E79',
  midBlue: '#2E75B6',
  lightBlue: '#D6E4F0',
  gold: '#C9A84C',
  white: '#FFFFFF',
  lightGray: '#F5F5F5',
  textDark: '#1A1A1A',
} as const;

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 24, maxWidth: 1000, margin: '0 auto', fontFamily: 'system-ui', background: RCS.white, color: RCS.textDark },
  h1: { margin: 0, color: RCS.deepNavy },
  muted: { opacity: 0.85, marginTop: 6, marginBottom: 16 },
  card: { border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 16, background: RCS.white },
  sectionHeader: {
    background: RCS.deepNavy,
    color: RCS.white,
    padding: '8px 10px',
    borderRadius: 10,
    borderBottom: `3px solid ${RCS.gold}`,
    fontWeight: 900,
    marginBottom: 12,
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 },
  tile: {
    display: 'block',
    padding: 12,
    borderRadius: 12,
    border: `1px solid ${RCS.deepNavy}`,
    background: RCS.lightBlue,
    textDecoration: 'none',
    color: RCS.textDark,
  },
  tileTitle: { fontWeight: 900, color: RCS.deepNavy, marginBottom: 4 },
  tileText: { opacity: 0.9 },
  secondaryLink: {
    padding: '10px 12px',
    borderRadius: 10,
    border: `1px solid ${RCS.gold}`,
    background: 'transparent',
    color: RCS.deepNavy,
    textDecoration: 'none',
    fontWeight: 900,
    display: 'inline-block',
  },
};
