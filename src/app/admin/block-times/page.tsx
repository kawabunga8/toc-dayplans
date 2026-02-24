import { Suspense } from 'react';
import BlockTimesClient from './BlockTimesClient';

export const dynamic = 'force-dynamic';

export default function BlockTimesPage() {
  return (
    <Suspense>
      <BlockTimesClient />
    </Suspense>
  );
}
