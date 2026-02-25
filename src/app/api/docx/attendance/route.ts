import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import {
  attendanceSheetTable,
  createRcsDoc,
  packDoc,
  spacer,
  titleBlock,
} from '@/lib/docx/rcsStyle';

export const runtime = 'nodejs';

type Student = { id: string; first_name: string; last_name: string };

type Block = {
  id: string;
  start_time: string;
  end_time: string;
  room: string;
  class_name: string;
  class_id: string | null;
  students?: Student[];
};

type PublicPlan = {
  id: string;
  plan_date: string;
  slot: string;
  title: string;
  blocks: Block[];
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const planId = searchParams.get('planId');
  const blockId = searchParams.get('blockId');

  if (!planId || !blockId) {
    return NextResponse.json({ error: 'Missing planId or blockId' }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.json({ error: 'Missing Supabase env (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY).' }, { status: 500 });
  }

  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Public-safe RPC (security definer) will return null if not published.
  const { data, error } = await supabase.rpc('get_public_day_plan_by_id', { plan_id: planId });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Plan not found or not published' }, { status: 404 });
  }

  const plan = data as unknown as PublicPlan;
  const block = (plan.blocks ?? []).find((b) => b.id === blockId);
  if (!block) {
    return NextResponse.json({ error: 'Block not found' }, { status: 404 });
  }

  const students = (block.students ?? [])
    .slice()
    .sort((a, b) => {
      const ln = a.last_name.localeCompare(b.last_name);
      return ln !== 0 ? ln : a.first_name.localeCompare(b.first_name);
    });

  const dateLine = plan.plan_date;
  const timeLine = `${formatTime(block.start_time)}–${formatTime(block.end_time)}`;
  const roomLine = block.room ? `Room ${block.room}` : 'Room —';

  const inferredBlock = inferBlockLabel(block.class_name) ?? (plan.slot ? String(plan.slot) : null);
  const blockLine = inferredBlock ? `Block ${inferredBlock}` : 'Block';

  const teacherLine = ''; // prompt doesn't require teacher; keep the title block clean
  const classLine = String(block.class_name ?? '').trim() || 'Class';
  const detailLine = `${blockLine}  •  ${roomLine}  •  ${formatLongDate(dateLine)}  •  ${timeLine}`;

  const children = [
    titleBlock(teacherLine, classLine, 'Attendance Sheet', detailLine),
    spacer(),
    attendanceSheetTable(students),
    spacer(),
  ];

  const doc = createRcsDoc(children);
  const buf = await packDoc(doc);

  const safe = `${plan.plan_date}-${blockLine}-${block.class_name}`.replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 80);

  return new NextResponse(buf as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="attendance-${safe}.docx"`,
    },
  });
}

function formatTime(t: string) {
  return (t ?? '').slice(0, 5) || t;
}

function inferBlockLabel(className: string | null | undefined): string | null {
  const m = /\bBlock\s+([A-Z]+|CLE)\b/i.exec(String(className ?? ''));
  return m?.[1] ? String(m[1]).toUpperCase() : null;
}

function formatLongDate(yyyyMmDd: string): string {
  // Render like: Wednesday, February 25, 2026 (local)
  const [y, m, d] = String(yyyyMmDd).split('-').map((x) => Number(x));
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
