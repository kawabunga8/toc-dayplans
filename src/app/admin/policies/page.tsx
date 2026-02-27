import { Suspense } from 'react';
import PoliciesClient from './PoliciesClient';

export const dynamic = 'force-dynamic';

export default function PoliciesPage() {
  return (
    <Suspense>
      <PoliciesClient />
    </Suspense>
  );
}
