import { Suspense } from 'react';
import CoreCompetenciesClient from './CoreCompetenciesClient';

export const dynamic = 'force-dynamic';

export default function CoreCompetenciesPage() {
  return (
    <Suspense>
      <CoreCompetenciesClient />
    </Suspense>
  );
}
