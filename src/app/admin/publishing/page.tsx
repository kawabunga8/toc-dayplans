import { Suspense } from 'react';
import PublishingClient from './PublishingClient';

export const dynamic = 'force-dynamic';

export default function PublishingPage() {
  return (
    <Suspense>
      <PublishingClient />
    </Suspense>
  );
}
