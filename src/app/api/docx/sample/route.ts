import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

import { body, createRcsDoc, headerWithWordmark, packDoc, spacer } from '@/lib/docx/rcsStyle';

export const runtime = 'nodejs';

export async function GET() {
  const logoPath = path.join(process.cwd(), 'assets', 'rcs-wordmark.png');
  const wordmarkPng = fs.readFileSync(logoPath);

  const doc = createRcsDoc([
    headerWithWordmark({
      wordmarkPng,
      teacherName: 'Teacher Name',
      className: 'Class / Block',
      subtitle: 'TOC Day Plan',
      courseDetail: 'Room • Date',
    }),
    spacer(),
    body('Sample document generated using the RCS style guide components.'),
  ]);

  const buf = await packDoc(doc);

  return new NextResponse(buf as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': 'attachment; filename="toc-dayplan-sample.docx"',
    },
  });
}
