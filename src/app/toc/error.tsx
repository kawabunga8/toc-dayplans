'use client';

export default function TocError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      gap: 16,
      fontFamily: 'system-ui, sans-serif',
      color: '#1a1a2e',
    }}>
      <p style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
        Unable to load day plans right now.
      </p>
      <p style={{ margin: 0, color: '#555' }}>
        There was a problem connecting to the database. Please try again.
      </p>
      <button
        onClick={reset}
        style={{
          marginTop: 8,
          padding: '8px 20px',
          background: '#1a3a6b',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: 15,
        }}
      >
        Try again
      </button>
    </div>
  );
}
