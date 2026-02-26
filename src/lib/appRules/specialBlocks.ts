// Helpers for special schedule blocks that are still represented as rows in `classes`.

export function normalizeBlockLabel(label: string | null | undefined): string {
  return String(label ?? '').trim().toUpperCase();
}
