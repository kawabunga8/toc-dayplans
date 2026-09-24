# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (localhost:3000)
npm run build      # Production build
npm run lint       # ESLint check
```

No test suite is configured.

## Architecture

**TOC Dayplans** is a Next.js 16 (App Router) + TypeScript app for Richmond Christian School. Staff create and publish daily lesson plans for substitute teachers (TOCs). There are two distinct user surfaces:

### Infrastructure note (2026-09-23) — the deliberate exception

Unlike course-hub/rcs-report-card-tool/group-maker/KawaHoot (which moved to
a self-hosted local Postgres stack and had their Vercel deployments paused
+ git-disconnected — see `local-stack/STATUS.md`), **this app deliberately
stays on the original managed cloud Supabase project, still git-connected,
still deployed live**, because substitute teachers need to reach a
published plan remotely, on their own device, at any time — a requirement
none of the other four apps have.

Its Vercel project has `ssoProtection: { deploymentType:
"all_except_custom_domains" }` — every deployment URL requires a Vercel
login *except* its one canonical public subdomain, `toc-dayplans.vercel.app`
(the org-suffixed alias, the git-branch alias, and every per-deployment
build URL are all gated). Verified live 2026-09-23: that one public URL,
and the public API routes it calls (`/api/public/classes`,
`/api/public/rotation`, `/api/public/plan`), carry no student data — the
`classes` endpoint returns only course metadata, and all currently-
published plans were scanned clean of student names in both rendered
content and raw JSON. See the public attendance-roster removal
(`8ea9079`) below for the feature change that made this true.

### No student data (2026-09-24)

This app no longer serves student data. Still reading it, pending a decision:
`/api/ai/suggest` loads first/last names to screen them out of text sent to
Claude (it refuses to send if the list can't load), and the publish route's
name warning checks per-block `students` (now always empty, so it no longer
fires). Removed: the admin Class
lists page (rosters + student photos), the unused public
`/api/toc/plan/[id]` route (returned enrolled students' names and photo
paths with the service-role key, no auth), and the per-block `students`
key from `resolve_day_plan_payload` / `get_public_day_plan_live`
(migration `20260924120000_remove_students_from_day_plan_payloads.sql`,
which also strips it from stored `published_payload` snapshots). Don't
add student lookups back — rosters and photos belong to Course Hub, which
runs locally, not in this cloud project.

- **Admin** (`/admin/*`): Authenticated staff create/edit/publish dayplans with schedule blocks and TOC instructions
- **Public** (`/toc`, `/p/[id]`): TOCs browse published plans by week and print them

### Key architectural patterns

- **Server-side auth**: Admin pages use `export const dynamic = 'force-dynamic'` to fetch Supabase session server-side. Staff roles (`admin/editor/viewer`) live in `staff_profiles`.
- **Published payload snapshot**: When staff publish a plan, a canonical JSON snapshot (`published_payload`) is stored in `day_plans`. The schema contract is documented in `docs/architecture/effective-plan-contract.md`. This snapshot merges class templates with per-block overrides.
- **AppRules library** (`src/lib/appRules/`): All domain-specific business logic lives here — school day calculations, Friday Day 1/Day 2 rotation, special block types (Flex, Lunch, Chapel, CLE), navigation URL builders, and template merging.
- **Supabase RPC functions**: Complex queries use Supabase RPCs (e.g., `get_public_plans_for_week`, `is_staff()`). RLS policies are defined in `supabase/schema.sql`.
- **AI lesson flow**: Claude (Anthropic) is the only provider — see `src/lib/ai/providers/`; the RCS-approved AI tool for this feature, matching rcs-report-card-tool's decision. The API route `/api/admin/dayplans/blocks/[blockId]/lesson-flow/append` generates and appends AI lesson flows to a block. Prompt templates are in `src/lib/teacherSuperprompt/`.
- **No global state**: Admin UI uses `'use client'` components with local React state + API route calls. No Redux/Zustand.

### Core data model

```
day_plans           → One plan per (plan_date, slot, friday_type?) — visibility, published_payload, trashed_at
day_plan_blocks     → Time blocks within a dayplan (start/end, room, class_name, class_id)
toc_block_plans     → TOC-specific overrides per block (lesson_flow_phases, activity_options, plan_mode)
class_toc_templates → Reusable template content per class (default_tags, etc.)
classes             → Course definitions (block_label, grade_level, room)
toc_snippets        → Reusable text fragments
```

### Publishing / visibility

- `/toc` shows all non-trashed plans for the chosen week (`trashed_at IS NULL`)
- `trashed_at` is the primary "unpublish" mechanism
- `visibility='link'` may exist for share-link semantics but `/toc` does not depend on it
- If you change publishing rules, update both UI queries (`TocClient.tsx`) and DB RPCs (`supabase/schema.sql`)

### Friday handling

Many features require explicit `friday_type` (day1/day2) when the date is a Friday:
- Rotation comes from `get_rotation_for_date(plan_date, friday_type)`
- If `friday_type` is missing on a Friday, rotation returns `[]`
- When adding features that query rotation on Fridays, ensure the caller supplies `friday_type` or infers it from existing `day_plans` rows

### AI integration (`/admin/teacher`)

The teacher lesson flow generator:
1. Selects a date + block, builds Section 1 context, selects an educator role
2. Calls `POST /api/ai/suggest` → returns JSON phases
3. Staff must check "I have reviewed this AI-generated content..." in the Preview panel before Apply is enabled (`TeacherClient.tsx`'s `reviewed` state) — required because `/p` renders live data, so Apply on an already-published plan makes the content visible to TOCs immediately, with no separate re-publish step
4. Applies via `/api/admin/dayplans/blocks/[blockId]/lesson-flow/append`

Important:
- AI suggest endpoints must force JSON-only output
- When applying to Friday blocks, include `friday_type`
- Claude (Anthropic) is the only provider here, and that's correct as long as it stays that way: the "Learner diversity"/"Differentiation strategy (UDL / IEP)" fields (`TeacherClient.tsx`, `TocTemplateClient.tsx`, `superprompt.ts`) are aggregate class-composition context the teacher types in (e.g. "2 students with IEPs, mixed prior knowledge"), never individual student names or IEP note content — that's why this feature doesn't need the local-AI path rcs-report-card-tool uses for actual per-student data. If a future feature here ever sends individual student records/notes to an AI provider, it must switch to a local model instead, per the standing RCS AI data-sensitivity rule (Claude only for non-student-data features).

### Where things usually break

- **RLS / env**: anon vs service role key — check `SUPABASE_SERVICE_ROLE_KEY` is set server-side
- **Friday rotation**: missing `friday_type` causes empty rotation
- **Week vs selectedDate**: UI can look empty if selected date is outside the loaded week
- **AI JSON parsing**: model outputs non-JSON unless strictly constrained in the prompt

### Path aliases

`@/*` maps to `./src/*` (configured in `tsconfig.json`).

### Environment

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # needed for server-side admin API routes

# AI (required for AI features)
ANTHROPIC_API_KEY=
```

### Deploy notes

- DB changes in `supabase/schema.sql` are **not** automatically applied — run them in the Supabase SQL editor after deploying
- `/p/[id]` should remain print-friendly; avoid exposing internal debug text there
