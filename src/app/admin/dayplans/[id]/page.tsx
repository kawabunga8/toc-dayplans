// Placeholder edit page (next step).

export default async function DayPlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1>Dayplan</h1>
      <p style={{ opacity: 0.8 }}>ID: {id}</p>
      <p>
        Next: edit title/notes, add schedule blocks, generate share link.
      </p>
    </main>
  );
}
