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

- **Admin** (`/admin/*`): Authenticated staff create/edit/publish dayplans with schedule blocks and TOC instructions
- **Public** (`/toc`, `/p/[id]`): TOCs browse published plans by week and print them

### Key architectural patterns

- **Server-side auth**: Admin pages use `export const dynamic = 'force-dynamic'` to fetch Supabase session server-side. Staff roles (`admin/editor/viewer`) live in `staff_profiles`.
- **Published payload snapshot**: When staff publish a plan, a canonical JSON snapshot (`published_payload`) is stored in `day_plans`. The schema contract is documented in `docs/architecture/effective-plan-contract.md`. This snapshot merges class templates with per-block overrides.
- **AppRules library** (`src/lib/appRules/`): All domain-specific business logic lives here — school day calculations, Friday Day 1/Day 2 rotation, special block types (Flex, Lunch, Chapel, CLE), navigation URL builders, and template merging.
- **Supabase RPC functions**: Complex queries use Supabase RPCs (e.g., `get_public_plans_for_week`, `is_staff()`). RLS policies are defined in `supabase/schema.sql`.
- **AI lesson flow**: Gemini and Anthropic providers are in `src/lib/ai/providers/`. The API route `/api/admin/dayplans/blocks/[blockId]/lesson-flow/append` generates and appends AI lesson flows to a block. Prompt templates are in `src/lib/teacherSuperprompt/`.
- **No global state**: Admin UI uses `'use client'` components with local React state + API route calls. No Redux/Zustand.

### Core data model

```
day_plans           → One plan per (plan_date, slot, friday_type?) — visibility, published_payload, trashed_at
day_plan_blocks     → Time blocks within a dayplan (start/end, room, class_name, class_id)
toc_block_plans     → TOC-specific overrides per block (lesson_flow_phases, activity_options, plan_mode)
class_toc_templates → Reusable template content per class (default_tags, etc.)
classes             → Course definitions (block_label, grade_level, room)
enrollments         → Class ↔ Student mappings
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
3. Applies via `/api/admin/dayplans/blocks/[blockId]/lesson-flow/append`

Important:
- AI suggest endpoints must force JSON-only output
- When applying to Friday blocks, include `friday_type`
- Default provider is Anthropic (`AI_BRAIN=anthropic`); set `AI_BRAIN=gemini` to use Gemini
- On rate limit, the suggest route automatically falls back to Anthropic

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

# AI (at least one required for AI features)
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
AI_BRAIN=anthropic            # or: gemini
```

### Deploy notes

- DB changes in `supabase/schema.sql` are **not** automatically applied — run them in the Supabase SQL editor after deploying
- `/p/[id]` should remain print-friendly; avoid exposing internal debug text there
