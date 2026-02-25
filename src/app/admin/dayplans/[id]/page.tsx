import DayPlanDetailClient from './DayPlanDetailClient';

export default async function DayPlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DayPlanDetailClient planId={id} />;
}
