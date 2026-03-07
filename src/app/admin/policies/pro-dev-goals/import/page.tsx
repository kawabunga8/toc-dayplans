import { Suspense } from 'react';
import ImportClient from './ImportClient';

export const dynamic = 'force-dynamic';

export default function ProDevGoalsImportPage() {
  return (
    <Suspense>
      <ImportClient />
    </Suspense>
  );
}
