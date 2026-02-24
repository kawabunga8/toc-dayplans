import { Suspense } from 'react';
import DayPlanDetailClient from './DayPlanDetailClient';

export const dynamic = 'force-dynamic';

export default async function DayPlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <Suspense>
      <DayPlanDetailClient id={id} />
    </Suspense>
  );
}
