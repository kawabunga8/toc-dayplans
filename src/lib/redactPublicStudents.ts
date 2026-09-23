// The public, unauthenticated day-plan surfaces (the /p/[id] link and the TOC
// print view) never need per-student data — there is no attendance-roster
// feature on those pages. Strip `students` off every block right after the
// Supabase RPC call, before the payload reaches a client component or an API
// response, so student names can never leave the server on these surfaces.
export function redactStudentsInPlan<T extends { blocks?: unknown }>(payload: T | null | undefined): T | null {
  if (!payload) return payload ?? null;
  const blocks = (payload as { blocks?: unknown }).blocks;
  if (!Array.isArray(blocks)) return payload as T;
  return {
    ...payload,
    blocks: blocks.map((b) => {
      const { students: _students, ...rest } = b as { students?: unknown } & Record<string, unknown>;
      return rest;
    }),
  } as T;
}
