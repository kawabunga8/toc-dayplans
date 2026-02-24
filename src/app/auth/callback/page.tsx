// Kept for compatibility with older magic-link emails.
// (Safe to remove later once no old links are in circulation.)

import { Suspense } from 'react';
import CallbackClient from './CallbackClient';

export const dynamic = 'force-dynamic';

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackClient />
    </Suspense>
  );
}
