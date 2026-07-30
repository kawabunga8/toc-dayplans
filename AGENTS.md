# toc-dayplans — Agent Context

## What this app is
Daily lesson plan creator for Richmond Christian School substitute teachers (TOCs).
Staff create and publish day plans; TOCs browse and print them.

Two surfaces:
- `/admin/*` — authenticated staff create/edit/publish plans
- `/toc`, `/p/[id]` — public TOC view (no auth required)

## Tech stack
- Next.js 16 (App Router) + TypeScript
- Supabase (shared project — same as student-hub, rcs-report-card-tool)
- Auth: Supabase SSR, staff roles in `staff_profiles`
- AI: Anthropic (default) + Gemini fallback for lesson flow generation

## Commands
```bash
npm run dev     # localhost:3000
npm run build
npm run lint
```

## Key directories
```
src/app/admin/          ← all staff-facing pages
src/app/toc/            ← public TOC browse/print
src/app/api/            ← API routes (admin mutations + public reads)
src/lib/appRules/       ← ALL business logic (school days, rotation, Friday types)
supabase/schema.sql     ← full DB schema (must be applied manually in Supabase SQL editor)
supabase/migrations/    ← incremental migrations (also applied manually)
```

## Database tables (public schema)
Core:
- `day_plans` — one per (plan_date, slot, friday_type?)
- `day_plan_blocks` — time blocks within a plan
- `toc_block_plans` — TOC-specific overrides per block
- `class_toc_templates` — reusable template content per class
- `toc_snippets` — reusable text fragments

Shared with other apps (read + write):
- `students` — managed primarily in student-hub
- `classes` — course definitions, shared with student-hub/Kawahoot/group-maker
- `enrollments` — student ↔ class, shared with student-hub

## Required env vars
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
AI_BRAIN=anthropic      # or: gemini
```

## Health checks
- `npm run build` exits 0
- `/toc` loads without errors (public route — no auth needed)
- `/admin/dayplans` loads after login
- `select count(*) from day_plans where trashed_at is null` returns plans

## Common issues
- **Empty admin views** — check `SUPABASE_SERVICE_ROLE_KEY` is set server-side
- **Missing Friday rotation** — `friday_type` must be set on Friday day_plans
- **AI not generating** — check `ANTHROPIC_API_KEY` or `GEMINI_API_KEY`
- **Schema changes not live** — `supabase/schema.sql` changes must be run manually in Supabase SQL editor

## Friday handling (critical)
Many features break if `friday_type` (day1/day2) is missing on a Friday date.
Always ensure Friday plans have `friday_type` set before querying rotation.

## Role in the ecosystem
- **Writes:** day_plans, day_plan_blocks, toc_block_plans, class_toc_templates, toc_snippets
- **Reads + writes:** classes (block definitions), enrollments
- **Reads:** students (for class roster display)
- **Does NOT own:** student data — use student-hub for that
