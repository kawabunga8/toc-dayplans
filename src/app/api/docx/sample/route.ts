import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

import {
  activityBox,
  blueBox,
  body,
  bulletItem,
  createRcsDoc,
  goldBox,
  headerWithWordmark,
  infoTable,
  numberedItem,
  packDoc,
  phaseTable,
  roleTable,
  sectionHeader,
  spacer,
  subHeader,
  titleBlock,
} from '@/lib/docx/rcsStyle';

export const runtime = 'nodejs';

export async function GET() {
  const logoPath = path.join(process.cwd(), 'assets', 'rcs-wordmark.png');
  const wordmarkPng = fs.readFileSync(logoPath);

  const doc = createRcsDoc([
    // Exercise titleBlock
    titleBlock('Mr. Shingo Kawamura', 'Sample Class — Block X', 'TOC Lesson Plan', 'Course detail line'),
    spacer(),

    // Exercise sectionHeader
    sectionHeader('COMPONENT TEST', 'This document exercises every component'),
    spacer(),

    // Exercise headerWithWordmark variant
    headerWithWordmark({
      wordmarkPng,
      teacherName: 'Header Variant (Wordmark)',
      className: 'Not the titleBlock (variant)',
      subtitle: 'Used for other docs later',
      courseDetail: 'Logo left, title right',
    }),
    spacer(),

    // Exercise blueBox + body + bulletItem + numberedItem
    blueBox('Note to the TOC', [
      body('This is a blue info box. It can contain multiple paragraphs and list items.'),
      bulletItem('Bullet item one'),
      bulletItem('Bullet item two'),
      numberedItem('Numbered item one'),
      numberedItem('Numbered item two'),
    ]),
    spacer(),

    // Exercise subHeader + infoTable
    subHeader('Class Overview'),
    infoTable([
      ['Class', 'Sample Course — Block X'],
      ['Room', 'Room 123'],
      ['Phones', 'Recording only'],
      ['What Comes Next', 'Next class continues the unit'],
    ]),
    spacer(),

    // Exercise roleTable
    subHeader('Division of Roles'),
    roleTable([
      ['TOC', 'Attendance, supervision, and classroom management.'],
      ['TA', 'Leads the lesson activities and supports students.'],
    ]),
    spacer(),

    // Exercise phaseTable
    subHeader('Lesson Flow'),
    phaseTable([
      {
        time: '0–5',
        phase: 'Settle',
        activity: 'Students enter and get ready.\n\nTOC takes attendance.',
        purpose: 'Start the class smoothly',
      },
      {
        time: '5–25',
        phase: 'Work',
        activity: 'Independent practice time.\n\nTeacher circulates and supports.',
        purpose: 'Practice skills',
      },
    ]),
    spacer(),

    // Exercise activityBox
    subHeader('Activity Options'),
    activityBox('1', 'Option One', 'Short description line', [
      body('Details paragraph one.'),
      body('Details paragraph two.'),
      bulletItem('A detail bullet'),
    ]),
    spacer(),

    // Exercise goldBox
    goldBox('What to Do If...', [
      body('...a student is disruptive: have a quiet one-on-one conversation.'),
      body('...something urgent comes up: contact the teacher.'),
    ]),
  ]);

  const buf = await packDoc(doc);

  return new NextResponse(buf as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': 'attachment; filename="rcs-components-sample.docx"',
    },
  });
}
