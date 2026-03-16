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
day_plans           → One plan per staff member per date/slot
day_plan_blocks     → Time blocks within a dayplan
toc_block_plans     → TOC-specific overrides per block
class_toc_templates → Reusable template content per class
classes             → Course definitions
enrollments         → Class ↔ Student mappings
toc_snippets        → Reusable text fragments
```

### Path aliases

`@/*` maps to `./src/*` (configured in `tsconfig.json`).

### Environment

Requires `.env.local` with:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY` for AI features

See `src/lib/env.ts` for all validated env vars.
