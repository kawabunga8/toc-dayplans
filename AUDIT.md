# TOC Dayplans - Comprehensive Audit Report
**Date:** March 16, 2026
**Previous Audit:** February 25, 2026
**Status:** ✅ Mature, production-ready application

---

## Build & Deployment Status
- **Build:** ✅ Compiles successfully (TypeScript strict, no errors)
- **Framework:** Next.js 16.1.6 (Turbopack)
- **Routes:** 24 API routes, 9 admin pages, 3 public pages

---

## Feature Status

### PUBLIC / TOC SIDE — ✅ Fully Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| TOC Calendar View (`/toc`) | ✅ | Week picker, day indicators, side panel |
| Plan Detail Page (`/p/[id]`) | ✅ | Block selection, attendance lists, print |
| Calendar API | ✅ | Mon-Fri week, groups by date, link-only plans |
| Plan API | ✅ | Single plan with blocks + enrollment data |
| Attendance DOCX | ✅ | `/api/docx/attendance` generates attendance sheets |

### ADMIN / STAFF SIDE

| Feature | Status | Notes |
|---------|--------|-------|
| Auth (magic link) | ✅ | Supabase, callback at `/auth/callback` |
| Dashboard | ✅ | Staff guard via `is_staff()` RPC |
| Dayplan List & Create | ✅ | Date, slot, Friday type, title, notes |
| **Dayplan Detail Editor** | ✅ | Full editor — see below |
| Schedule Block Management | ✅ | Auto-generate + manual edit |
| TOC Block Plan Editor | ✅ | Per-block lesson flow, activity options, advanced |
| Course Template Editor | ✅ | `/admin/courses/[id]/toc-template` |
| Block Times Management | ✅ | `/admin/block-times` — Mon-Thu / Friday / Rotation |
| Class & Student Roster | ✅ | Enroll students, upload photos (Supabase Storage) |
| Learning Standards | ✅ | Browse/edit by subject+grade, rubric levels |
| Core Competencies | ✅ | Browse, select, link to dayplans |
| Pro Dev Goals | ✅ | Browse, link to assessment touch points |
| TOC Snippets | ✅ | Reusable text library |
| CSV Imports | ✅ | Standards, competencies, pro dev goals |
| **AI Lesson Generator** | ✅ | 6 teacher roles, Gemini + Anthropic |
| Publishing / Share Links | ✅ | Publish, revoke, trash, restore |

---

## Dayplan Detail Editor (`/admin/dayplans/[id]`)

Previously a placeholder — now **fully implemented** (~1,330 lines).

### Editing
- Notes, learning standard focus, core competency focus, Friday type
- Auto-save with status indicator

### Schedule Blocks
- **Generate:** Auto-creates blocks from block rotation + time defaults for the date
- **Edit:** Class name, room, start/end time, details per block
- **Save All:** Upserts all blocks, deletes removed ones

### TOC Integration (per block with a class)
- **TocBlockPlanInstanceEditor** — day-specific overrides:
  - Lesson Flow mode: phases with timing, activity, purpose
  - Activity Options mode: alternatives with steps and roles
  - Advanced sections: central theme, deep hope, big idea, assessment touch points, PD connections
  - Note to TOC with AI rewrite
  - Publish mode toggle (`toc` vs `advanced`)
- **Unpublished changes** banner when `toc_block_plans.updated_at > published_at`

### Publish Workflow
- Save All → Publish: calls `resolve_day_plan_payload` RPC → stores `published_payload` snapshot, sets `visibility='link'`, `published_at=now()`
- Revoke, trash, restore via separate API routes

---

## AI Integration

**Providers:** Anthropic (default) + Gemini (set `AI_BRAIN=gemini`)
Both have rate-limit handling with retry logic.

**Suggest endpoint:** `POST /api/ai/suggest`

| Section | Input | Output |
|---------|-------|--------|
| `note_to_toc_rewrite` | current note, class/date context | rewritten note string |
| `lesson_flow_phases` | class name, duration, constraints | phases array |
| `teacher_lesson_flow_phases` | role_id (1–6) + Section 1 context | phases array |

**Teacher Page (`/admin/teacher`):**
1. Pick week → select block → fill Section 1 context (subject, grade, class size, unit stage, tools, etc.)
2. Choose one of 6 pedagogical roles (Co-Designer, Inspiration Hub, Design Tutor, Assessment Specialist, Equity Champion, Subject Expert)
3. Write task + constraints → Generate
4. Preview phases → Apply: appends to `toc_block_plans.lesson_flow_phases`, auto-republishes, redirects to dayplan detail

---

## All API Routes

```
Admin
  GET/PATCH  /api/admin/classes
  POST       /api/admin/core-competencies/import
  POST       /api/admin/dayplans/[id]/publish
  POST       /api/admin/dayplans/[id]/restore
  POST       /api/admin/dayplans/[id]/revoke
  POST       /api/admin/dayplans/[id]/trash
  POST       /api/admin/dayplans/blocks/[blockId]/lesson-flow/append
  GET        /api/admin/dayplans/open
  GET        /api/admin/dayplans/week
  GET        /api/admin/debug/dayplans
  GET        /api/admin/debug/public-plan
  POST       /api/admin/learning-standards/import
  GET        /api/admin/learning-standards
  GET/PATCH  /api/admin/learning-standards/rubric
  POST       /api/admin/policies/import
  POST       /api/admin/pro-dev-goals/import

AI
  POST       /api/ai/suggest

DOCX
  GET        /api/docx/attendance
  GET        /api/docx/sample
  GET        /api/docx/toc-template/[id]   ← skeleton only

Public
  GET        /api/public/block-times
  GET        /api/public/friday-types
  GET        /api/public/plan
  GET        /api/public/rotation

TOC
  GET        /api/toc/calendar
  GET        /api/toc/plan/[id]
```

---

## Database Tables

```
day_plans              → Main plan record (visibility, published_payload, published_at, trashed_at)
day_plan_blocks        → Time blocks (start_time, end_time, room, class_name, class_id)
toc_block_plans        → Day-specific TOC overrides (lesson_flow_phases, activity_options, plan_mode, etc.)
class_toc_templates    → Reusable course-level template
classes                → Course definitions (room, block_label, sort_order, grade_level)
students               → Roster (first_name, last_name, photo_url)
enrollments            → Class ↔ Student (many-to-many)
block_time_defaults    → Mon-Thu / Friday time blocks
block_rotations        → A/B/C/D schedule rotation
learning_standards     → Curriculum standards with rubric levels
core_competencies      → BC Core Competency definitions
pro_dev_goals          → Professional development goals
toc_snippet_templates  → Reusable TOC text fragments
staff_profiles         → Authenticated users with roles
```

RLS enabled on all tables. `is_staff()` RPC gates all admin access.

---

## Environment

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI (at least one required for AI features)
ANTHROPIC_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
AI_BRAIN=anthropic   # or: gemini
```

---

## Known Gaps

| Priority | Gap |
|----------|-----|
| Medium | TOC template DOCX (`/api/docx/toc-template/[id]`) is a skeleton — no implementation |
| Medium | No CSV import for block times / rotation data |
| Medium | No bulk student roster import (CSV) |
| Medium | `share_token_hash` / `share_expires_at` columns exist but unused — plans are accessible by UUID only |
| Medium | No publish history / rollback to previous snapshot |
| Low | No attendance CSV export or historical attendance tracking |
| Low | Mobile responsiveness not optimized |
| Low | Some ARIA labels missing |
| Low | No audit logging (who published what, when) |
