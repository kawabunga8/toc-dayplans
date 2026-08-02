// Single source of truth for the Student Hub website URL.
//
// This is the SITE, not the Supabase API. It was previously copy-pasted into five
// components and had drifted — the Policies page pointed at a different host, so
// "Edit in Student Hub" led somewhere else whenever the env var was unset.
export const STUDENT_HUB_URL =
  process.env.NEXT_PUBLIC_STUDENT_HUB_URL ?? 'https://student-hub-ten-pearl.vercel.app';
