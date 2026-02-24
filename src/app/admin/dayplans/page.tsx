import { Suspense } from 'react';
import DayPlansClient from './DayPlansClient';

export const dynamic = 'force-dynamic';

export default function DayPlansPage() {
  return (
    <Suspense>
      <DayPlansClient />
    </Suspense>
  );
}
