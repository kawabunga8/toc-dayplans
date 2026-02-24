import { Suspense } from 'react';
import TocTemplateClient from './TocTemplateClient';

export const dynamic = 'force-dynamic';

export default function TocTemplatePage({ params }: { params: { id: string } }) {
  return (
    <Suspense>
      <TocTemplateClient classId={params.id} />
    </Suspense>
  );
}
