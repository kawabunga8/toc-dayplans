import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Kawamura — TOC Day Plans',
};

export default function Home() {
  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div style={styles.brandWrap}>
          <div style={styles.brandRow}>
            <img src="/rcs-wordmark.png" alt="RCS" style={styles.logo} />
            <div>
              <div style={styles.schoolName}>Richmond Christian School</div>
              <div style={styles.appName}>TOC Day Plans</div>
            </div>
          </div>
        </div>
      </header>

      <section style={styles.body}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Welcome</div>
          <div style={styles.cardText}>Choose where you’d like to go.</div>

          <div style={styles.btnRow}>
            <Link href="/toc" style={styles.primaryBtn}>
              View Schedule
            </Link>
            <Link href="/login" style={styles.secondaryBtn}>
              Admin Login
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

const RCS = {
  deepNavy: '#1F4E79',
  midBlue: '#2E75B6',
  gold: '#C9A84C',
  white: '#FFFFFF',
  lightGray: '#F5F5F5',
  textDark: '#1A1A1A',
} as const;

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: RCS.white, color: RCS.textDark, fontFamily: 'system-ui' },
  header: {
    background: RCS.deepNavy,
    borderBottom: `4px solid ${RCS.gold}`,
    padding: '22px 24px',
  },
  brandWrap: { maxWidth: 980, margin: '0 auto' },
  brandRow: { display: 'flex', gap: 14, alignItems: 'center' },
  logo: { height: 44, width: 'auto', display: 'block' },
  schoolName: { color: RCS.gold, fontWeight: 900, letterSpacing: 0.2, marginBottom: 6 },
  appName: { color: RCS.white, fontWeight: 900, fontSize: 28 },
  body: { padding: 24 },
  card: {
    maxWidth: 980,
    margin: '0 auto',
    border: `1px solid ${RCS.deepNavy}`,
    borderRadius: 14,
    padding: 18,
    background: RCS.white,
  },
  cardTitle: { fontWeight: 900, color: RCS.deepNavy, fontSize: 18, marginBottom: 6 },
  cardText: { opacity: 0.85, marginBottom: 14 },
  btnRow: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  primaryBtn: {
    padding: '10px 12px',
    borderRadius: 10,
    border: `1px solid ${RCS.gold}`,
    background: RCS.deepNavy,
    color: RCS.white,
    textDecoration: 'none',
    fontWeight: 900,
  },
  secondaryBtn: {
    padding: '10px 12px',
    borderRadius: 10,
    border: `1px solid ${RCS.gold}`,
    background: 'transparent',
    color: RCS.deepNavy,
    textDecoration: 'none',
    fontWeight: 900,
  },
};
