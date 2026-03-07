import { Suspense } from 'react';
import ProDevGoalsClient from './ProDevGoalsClient';

export const dynamic = 'force-dynamic';

export default function ProDevGoalsPage() {
  return (
    <Suspense>
      <ProDevGoalsClient />
    </Suspense>
  );
}
