# Effective TOC Plan Contract (Canonical Payload)

This document defines the canonical payload (shape + merge rules) that must be used by:
- `/p/<id>` (public/published plan)
- `/toc` plan drawer
- any docx/pdf export pipeline
- Admin preview tooling

## Core principle

**Effective = Template merged with Overrides (overrides-only).**

- Header fields: `override ?? template ?? default`
- Section child tables: use override rows if present; otherwise use template rows

## Inputs

Canonical resolver inputs:
- `plan_id: uuid` (required)

Resolver must determine a **primary block** for TOC content based on the plan slot:
- Prefer the `day_plan_blocks` row whose class block label matches `day_plans.slot`.
- If no match, fall back to earliest block.

## Output payload

The resolver returns a single JSON object:

```json
{
  "id": "<day_plan_id>",
  "plan_date": "YYYY-MM-DD",
  "slot": "A",
  "friday_type": "day1|day2|null",
  "title": "...",
  "visibility": "link|...",
  "blocks": [
    {
      "id": "<day_plan_block_id>",
      "start_time": "HH:MM:SS",
      "end_time": "HH:MM:SS",
      "room": "...",
      "class_name": "...",
      "details": "...|null",
      "class_id": "...|null",
      "students": [{"id":"...","first_name":"...","last_name":"..."}]
    }
  ],
  "toc": {
    "plan_mode": "lesson_flow|activity_options",
    "teacher_name": "...",
    "ta_name": "...",
    "ta_role": "...",
    "phone_policy": "...",
    "note_to_toc": "...",

    "class_overview_rows": [{"label":"...","value":"..."}],
    "division_of_roles_rows": [{"who":"...","responsibility":"..."}],

    "opening_routine_steps": [{"step_text":"..."}],

    "lesson_flow_phases": [
      {"time":"...","phase":"...","activity":"...","purpose":"..."}
    ],

    "activity_options": [
      {
        "title":"...",
        "description":"...",
        "details_text":"...",
        "toc_role_text":"...|null",
        "steps":[{"step_text":"..."}]
      }
    ],

    "what_to_do_if_items": [{"if":"...","then":"..."}],

    "end_of_class_items": [{"text":"..."}],

    "attendance_note": "..."
  }
}
```

Notes:
- `blocks` may contain only the primary block or all blocks, but `/p/<id>` must show the primary block.
- `toc.lesson_flow_phases` MUST be empty when mode is `activity_options` (and vice versa), but the keys always exist.

## Merge rules (authoritative)

### Header fields
Effective values are:
- `teacher_name = override_teacher_name ?? template.teacher_name ?? ''`
- `ta_name = override_ta_name ?? template.ta_name ?? ''`
- `ta_role = override_ta_role ?? template.ta_role ?? ''`
- `phone_policy = override_phone_policy ?? template.phone_policy ?? 'Not permitted'`
- `note_to_toc = override_note_to_toc ?? template.note_to_toc ?? ''`
- `plan_mode = toc_block_plans.plan_mode ?? template.plan_mode ?? 'lesson_flow'`

### Section child tables (atomic override)
For each section, determine whether override rows exist for the toc_block_plan:
- If override rows exist: use them
- Else: use template rows

Sections governed by this rule:
- class overview rows
- division of roles rows
- opening routine steps
- lesson flow phases
- activity options (+ steps)
- what-to-do-if items
- end-of-class bullets

### Attendance
- Student roster is derived from enrollments for the class_id.
- `attendance_note = override_attendance_note ?? template.attendance_note ?? ''`

## Stability requirements

- This payload is a **public contract** once deployed.
- Add fields by extending the object; do not rename keys.
- Keep colour key names stable (DEEP_BLUE, ACCENT_GOLD, etc.) in the style system.
