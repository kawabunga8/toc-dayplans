import { Suspense } from 'react';
import ImportClient from './ImportClient';

export const dynamic = 'force-dynamic';

export default function PoliciesImportPage() {
  return (
    <Suspense>
      <ImportClient />
    </Suspense>
  );
}
