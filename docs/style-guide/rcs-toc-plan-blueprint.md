# RCS TOC Day Plan — Canonical Blueprint (Web + DOCX)

This document defines the **canonical structure, terminology, and section order** for TOC-facing day plans.

It is the single source of truth for:
- `/p/<id>` (public/published plan)
- `/toc` plan drawer (TOC view)
- Admin editors (TOC Templates + Dayplans overrides)
- DOCX/PDF exports

It must align with the **RCS TOC Document Style Guide** implementation in:
- `src/lib/docx/rcsStyle.ts`

## Core principle

**Effective plan = Template merged with Overrides (overrides-only).**

If a teacher does not override a section in Dayplans, TOCs must see the **template content** automatically.

## Canonical section order (required)

1) **Header**
2) **Note to the TOC** (gold callout)
3) **Class Overview** (table)
4) **Division of Roles** (table)
5) **Opening Routine** (freeform ordered list)
6) **Plan Content (Mode)**
   - Lesson Flow (table) **OR** Activity Options (blocks)
7) **What to Do If…** (table)
8) **End of Class — Room Cleanup** (bullets)
9) **Attendance Sheet** (roster table)

## Canonical terminology (exact labels)

Use these exact strings in UI headings and exports:
- **TOC Day Plan** (subtitle)
- **Note to the TOC**
- **Class Overview**
- **Division of Roles**
- **Opening Routine**
- **Lesson Flow**
- **Activity Options**
- **What to Do If…**
- **End of Class — Room Cleanup**
- **Attendance Sheet**

## Section definitions

### 1) Header
**Purpose:** Identify teacher/class, plan type, block/date/time.

**DOCX reference:** `headerWithWordmark(...)` (preferred) or `titleBlock(...)`.

**Required fields:**
- Teacher name (effective)
- Class name
- Block label
- Room
- Date
- Time range
- Friday Day 1/Day 2 indicator (when applicable)

### 2) Note to the TOC (Gold)
**Purpose:** High-priority instructions for the TOC.

**DOCX reference:** `goldBox('Note to the TOC', ...)`

**Hide/show:**
- Show if non-empty.
- If empty, omit the box entirely.

### 3) Class Overview (Table)
**Purpose:** Quick scan of key context.

**DOCX reference:** `infoTable([...])`

**Data:** ordered rows of `{ label, value }`.

**Hide/show:**
- Show if at least one row exists.

**Starter defaults (seeded on new template):**
- Class
- Room
- Time
- Today’s Focus
- Context
- Phones
- End of Class
- What Comes Next

Labels are editable; any label is allowed.

### 4) Division of Roles (Table)
**Purpose:** Clarify responsibilities (TOC vs TA/Leaders/Students).

**DOCX reference:** `roleTable([...])`

**Data:** ordered rows of `{ who, responsibility }`.

**Hide/show:**
- Show if at least one row exists.

### 5) Opening Routine (Freeform list)
**Purpose:** Consistent start-of-class steps.

**Data:** ordered steps of `{ step_text }`.

**Hide/show:**
- Section is **required** conceptually, but if empty:
  - Show the header and a single line: “No opening routine provided.”

### 6) Plan Content (Mode)
The plan has one mode:
- **Lesson Flow** OR **Activity Options**

#### 6A) Lesson Flow
**DOCX reference:** `phaseTable(phases)`

**Data:** ordered phases of:
- time
- phase
- activity
- purpose

**Hide/show:**
- If mode is `lesson_flow`, show the section.
- If there are no phases, show “No lesson flow provided.”

#### 6B) Activity Options
**DOCX reference:** repeated `activityBox(...)`

**Data:** ordered options with nested steps:
- title
- description
- details_text
- toc_role_text (optional)
- steps[] (ordered list)

**Hide/show:**
- If mode is `activity_options`, show the section.
- If there are no options, show “No activity options provided.”

### 7) What to Do If… (Table)
**Purpose:** Fast scenario → response guidance.

**Canonical format:** 2-column table:
- **IF**
- **THEN**

**Hide/show:**
- Show if at least one row exists.

### 8) End of Class — Room Cleanup (Bullets)
**Purpose:** Clear end-of-class expectations.

**Data:** ordered bullets of `{ text }`.

**Hide/show:**
- Show if at least one bullet exists.

### 9) Attendance Sheet
**Purpose:** Printed roster for TOC.

**DOCX reference:** `attendanceSheetTable(students)`

**Hide/show:**
- In web `/p/<id>`: show roster when available.
- In exports: always include when roster available.

**Attendance banner note:** optional text displayed above roster.

## Rendering rules (Web vs Export)

- Web and export must render **the same sections** in the same order.
- Web may be more compact, but must not omit sections that exist.
- Only the selected block’s plan content is shown for a `/p/<id>` page.

## Source-of-truth mapping

- Templates live under `class_toc_templates` and child tables.
- Dayplan overrides live under `toc_block_plans` and `toc_*` override tables.
- Public rendering uses the **Effective Plan contract** (see `docs/architecture/effective-plan-contract.md`).
