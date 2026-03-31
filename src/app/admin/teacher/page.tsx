import { notFound } from 'next/navigation';
import { aiLessonFlowFlag } from '@/flags';
import TeacherClient from './TeacherClient';

export default async function AdminTeacherPage() {
  const enabled = await aiLessonFlowFlag();
  if (!enabled) notFound();
  return <TeacherClient />;
}
