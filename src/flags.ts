import { flag } from 'flags/next';

export const aiLessonFlowFlag = flag<boolean>({
  key: 'ai-lesson-flow',
  description: 'Enable the AI lesson flow suggestion tool in /admin/teacher',
  defaultValue: true,
  decide: () => true,
});
