import { Suspense } from 'react';
import ClassListsClient from './ClassListsClient';

export const dynamic = 'force-dynamic';

export default function ClassListsPage() {
  return (
    <Suspense>
      <ClassListsClient />
    </Suspense>
  );
}
