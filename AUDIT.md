# TOC Dayplans - Comprehensive Audit Report
**Date:** March 16, 2026
**Previous Audit:** March 16, 2026 (earlier today)
**Status:** ✅ Build clean — 27 API routes, 25 pages

---

## Build & Deployment Status
- **Build:** ✅ No errors, no TypeScript failures
- **Framework:** Next.js 16.1.6 (Turbopack)
- **Routes compiled:** 27 API + 25 pages (all dynamic/server-rendered)
- **Warning:** Next.js workspace root inference warning — cosmetic only, set `turbopack.root` in `next.config.ts` to silence

---

## What Changed Since Last Audit

### New features
| Area | Change |
|------|--------|
| `/toc` visibility | Now shows **all non-trashed plans** (Rule A); `visibility` field no longer gates TOC view |
| `/toc/print` | New print page (`TocPrintClient.tsx`) for printing the full TOC week view |
| `/p/[id]` live rendering | Switched from `published_payload` snapshot to **live RPC** (`get_public_day_plan_live`) — plan always reflects current data |
| `by-date-slot/lesson-flow/append` | New API route: append phases by date+slot instead of block ID (useful when block ID isn't known) |
| `debug/report` | New debug API route for generating diagnostic reports |
| AI fallback | `suggest` route now automatically falls back to Anthropic when Gemini is rate-limited |
| Gemini retries | Exponential backoff: 2s → 5s → 10s before giving up |
| Teacher UI | `handleGenerate` extracted; **Retry button** shown inline next to error |
| `/p` blueprint alignment | Section titles fixed (Opening Routine, Lesson Flow, Activity Options); empty states added; date formatted; teacher name dynamic |
| Logo | Portrait logo (64×64) on far right of header |
| `.vscode/settings.json` | Edge DevTools webhint disabled (suppresses inline-style warnings) |

### New DB migrations
| Migration | Purpose |
|-----------|---------|
| `add_grade_level_to_classes` | Adds `grade_level` column to `classes` |
| `get_public_day_plan_live` | RPC for live plan rendering (replaces snapshot) |
| `get_public_plans_for_week_live` | RPC for TOC week view (all non-trashed) |
| `drop_materialized_public_payload` | Removes old materialized payload dependency |
| `debug_events` | Debug event logging table |

---

## Full Feature Status

### PUBLIC / TOC — ✅ Fully Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| TOC Calendar (`/toc`) | ✅ | All non-trashed plans; auto-switches to calendar on load |
| TOC Print (`/toc/print`) | ✅ | New — full week print view |
| Plan Detail (`/p/[id]`) | ✅ | Live RPC rendering; blueprint-aligned sections |
| Blueprint section order | ✅ | All 9 canonical sections present and ordered |
| Empty states | ✅ | Opening Routine, Lesson Flow, Activity Options all handle empty |
| Attendance Sheet | ✅ | Interactive + print table |
| Attendance DOCX | ✅ | Download `.docx` per block |

### ADMIN — ✅ Fully Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| Auth (magic link) | ✅ | |
| Dayplan list & create | ✅ | |
| Dayplan detail editor | ✅ | Blocks, notes, standards, TOC plan |
| Schedule generation | ✅ | Auto-generate from rotation + time defaults |
| TOC block plan editor | ✅ | Lesson flow, activity options, advanced sections |
| Course template editor | ✅ | `/admin/courses/[id]/toc-template` |
| Block times management | ✅ | Mon-Thu / Friday / Rotation |
| Class & student roster | ✅ | Enroll, photos, grade level |
| Learning standards | ✅ | Browse, rubric levels, link to dayplans |
| Core competencies | ✅ | Browse, link to dayplans |
| Pro dev goals | ✅ | Browse, link to assessment touch points |
| TOC snippets | ✅ | Reusable text library |
| CSV imports | ✅ | Standards, competencies, pro dev goals |
| AI lesson generator | ✅ | 6 roles, Gemini + Anthropic, retry + fallback |
| Publishing | ✅ | Publish, revoke, trash, restore + share links |

---

## All Pages (25)

```
/                             Home
/login                        Magic link auth
/auth/callback                Supabase callback
/reset-password               Password reset
/toc                          TOC week calendar
/toc/print                    TOC week print view  ← NEW
/p/[id]                       Public plan detail

/admin                        Staff dashboard
/admin/dayplans               List & create
/admin/dayplans/[id]          Detail editor
/admin/block-times            Time defaults
/admin/class-lists            Student roster + photos
/admin/courses                Course list
/admin/courses/[id]/toc-template  Course template editor
/admin/policies               Learning standards
/admin/policies/core-competencies
/admin/policies/core-competencies/import
/admin/policies/pro-dev-goals
/admin/policies/pro-dev-goals/import
/admin/policies/toc-snippets
/admin/policies/import
/admin/publish                Publish (legacy)
/admin/publishing             Publish + share links
/admin/teacher                AI lesson generator
/admin/public-layout          Layout settings
```

---

## All API Routes (27)

```
Admin
  GET/PATCH  /api/admin/classes
  POST       /api/admin/core-competencies/import
  POST       /api/admin/dayplans/[id]/publish
  POST       /api/admin/dayplans/[id]/restore
  POST       /api/admin/dayplans/[id]/revoke
  POST       /api/admin/dayplans/[id]/trash
  POST       /api/admin/dayplans/blocks/[blockId]/lesson-flow/append
  POST       /api/admin/dayplans/by-date-slot/lesson-flow/append  ← NEW
  GET        /api/admin/dayplans/open
  GET        /api/admin/dayplans/week
  GET        /api/admin/debug/dayplans
  GET        /api/admin/debug/public-plan
  POST       /api/admin/debug/report                              ← NEW
  GET        /api/admin/learning-standards
  GET/PATCH  /api/admin/learning-standards/rubric
  POST       /api/admin/policies/import
  POST       /api/admin/pro-dev-goals/import

AI
  POST       /api/ai/suggest  (Gemini → Anthropic fallback)

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

## Known Gaps

| Priority | Gap |
|----------|-----|
| Medium | TOC template DOCX (`/api/docx/toc-template/[id]`) — skeleton only |
| Medium | No CSV import for block times / rotation |
| Medium | No bulk student roster import (CSV) |
| Medium | `share_token_hash` / `share_expires_at` exist but unused — plan UUID is the only access mechanism |
| Medium | No publish history / snapshot rollback |
| Low | `turbopack.root` not set in `next.config.ts` (cosmetic build warning) |
| Low | No attendance CSV export or historical tracking |
| Low | Mobile responsiveness not optimized |
| Low | No audit logging (who changed what, when) |
