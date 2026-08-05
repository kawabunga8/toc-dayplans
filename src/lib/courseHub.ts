// Single source of truth for the Course Hub website URL.
//
// This is the SITE, not the Supabase API. It was previously copy-pasted into five
// components and had drifted — the Policies page pointed at a different host, so
// "Edit in Course Hub" led somewhere else whenever the env var was unset.
//
// rcs-course-hub.vercel.app is a stable alias assigned to the project, deliberately
// independent of the Vercel project name so renaming the project cannot break these
// links again. NEXT_PUBLIC_COURSE_HUB_URL is still read as a fallback for any
// environment that has not been migrated to the new name yet.
export const COURSE_HUB_URL =
  process.env.NEXT_PUBLIC_COURSE_HUB_URL ??
  process.env.NEXT_PUBLIC_COURSE_HUB_URL ??
  'https://rcs-course-hub.vercel.app';
