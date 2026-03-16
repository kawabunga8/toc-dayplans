# toc-dayplans — Agent / Claude Project Notes

This file is a lightweight guide for AI coding assistants working in this repo.

## What this app is
A Next.js (App Router) + Supabase app for building day plans and publishing TOC-facing views.

Key surfaces:
- **/admin** — staff-only admin UI
- **/toc** — TOC dashboard (week + today)
- **/p/[id]** — public plan view (print-friendly)
- **API routes** under `src/app/api/*`
- **Supabase schema + RPCs** in `supabase/schema.sql`

## Core data model (high level)
- `day_plans` — one row per (plan_date, slot, friday_type?) with notes/title/visibility/trashed_at
- `day_plan_blocks` — schedule entries for a plan (start/end, room, class_name, optional class_id)
- `classes` — Courses/Rooms catalog (block_label, grade_level, etc.)
- `class_toc_templates` — per-class templates (default_tags etc.)
- `toc_block_plans` — per-day_plan_block instance overrides (lesson flow, etc.)

## Publishing / visibility (current semantics)
- **/toc**: intended to show **all non-trashed plans** for the chosen week (Rule A)
- `visibility` may still exist for share-link semantics, but /toc should not depend on it.
- `trashed_at` is the primary "unpublish" mechanism.

If you change publishing rules, update BOTH:
- UI queries (`src/app/toc/page.tsx`) and client logic (`src/app/toc/TocClient.tsx`)
- DB RPC fallbacks (e.g., `get_public_plans_for_week` in `supabase/schema.sql`)

## Friday handling
Many parts of the app require explicit `friday_type` when the date is a Friday.
- Rotation comes from `get_rotation_for_date(plan_date, friday_type)`.
- If `friday_type` is missing on Friday, rotation returns `[]`.

When adding any feature that queries rotation on a Friday:
- ensure the caller can supply `friday_type` (day1/day2), OR
- infer it from existing `day_plans` rows for that date.

## /teacher (lesson flow generator)
`/admin/teacher` is a staff tool that:
- selects a date+block
- builds Section 1 context
- selects an educator role
- calls `/api/ai/suggest` to generate **JSON** phases
- can apply phases via `/api/admin/dayplans/by-date-slot/lesson-flow/append`

Important:
- AI suggest endpoints must **force JSON-only output**.
- When applying to Friday blocks, include `friday_type`.
- Context tags should come from `class_toc_templates.default_tags` (active template), consistent with `/admin/courses`.

## /p (public plan view)
- Should be print-friendly.
- Avoid exposing internal troubleshooting text.
- Optional debug views should be removed or strongly gated.

## Coding conventions
- Prefer small, explicit fixes over large refactors.
- Don’t break existing URLs.
- Keep server-side logic in API routes / RPCs; keep client UIs resilient to missing fields.
- When you change DB RPC semantics, update `supabase/schema.sql` and note that it must be applied in Supabase.

## Where things usually break
- **RLS / env**: anon vs service role access
- **Friday rotation**: missing `friday_type`
- **Week vs selectedDate**: UI can look empty if selected date is outside the loaded week
- **AI JSON parsing**: model outputs non-JSON unless strictly constrained

## Useful commands
From repo root:
- `npm run build`
- `npm run dev`

## Deploy notes
- DB changes in `supabase/schema.sql` are not automatically applied; run them in Supabase SQL editor.
- If you rely on service role access server-side, ensure `SUPABASE_SERVICE_ROLE_KEY` is available in the deployment environment.
