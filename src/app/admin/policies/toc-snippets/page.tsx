import { Suspense } from 'react';
import TocSnippetsClient from './TocSnippetsClient';

export const dynamic = 'force-dynamic';

export default function TocSnippetsPage() {
  return (
    <Suspense>
      <TocSnippetsClient />
    </Suspense>
  );
}
