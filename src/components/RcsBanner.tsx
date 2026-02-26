'use client';

import React from 'react';

const RCS = {
  deepNavy: '#1F4E79',
  gold: '#C9A84C',
  white: '#FFFFFF',
} as const;

export default function RcsBanner(props: {
  maxWidth?: number;
  logoHeight?: number;
  rightSlot?: React.ReactNode;
}) {
  const maxWidth = props.maxWidth ?? 1100;
  const logoHeight = props.logoHeight ?? 66;

  return (
    <header style={styles.banner}>
      <div style={{ ...styles.inner, maxWidth }}>
        <div style={styles.row}>
          <div>
            <div style={styles.schoolName}>Richmond Christian School</div>
            <div style={styles.appName}>TOC Day Plans</div>
          </div>

          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            {props.rightSlot}
            <img src="/rcs-wordmark.png" alt="RCS" style={{ ...styles.logo, height: logoHeight }} />
          </div>
        </div>
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  banner: { background: RCS.deepNavy, borderBottom: `4px solid ${RCS.gold}`, padding: '22px 24px' },
  inner: { margin: '0 auto' },
  row: { display: 'flex', gap: 14, alignItems: 'center', justifyContent: 'space-between' },
  logo: { width: 'auto', display: 'block' },
  schoolName: { color: RCS.gold, fontWeight: 900, letterSpacing: 0.2, marginBottom: 6 },
  appName: { color: RCS.white, fontWeight: 900, fontSize: 28 },
};
