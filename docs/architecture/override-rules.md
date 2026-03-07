# Overrides-only Rules (Templates vs Dayplans)

This document defines how overrides work so that:
- Template edits propagate everywhere by default
- Dayplan edits affect only that specific day/block
- The system remains scalable and predictable

## Key terms

- **Template:** `class_toc_templates` + child tables (`class_*`)
- **Instance / Override:** `toc_block_plans` + override child tables (`toc_*`)
- **Effective plan:** template merged with overrides

## Non-negotiable principle

**Do not copy template content into override tables by default.**

Override tables must store *only* teacher changes made in Dayplans.

## Header overrides

Stored on `toc_block_plans` as nullable override fields:
- `override_teacher_name`
- `override_ta_name`
- `override_ta_role`
- `override_phone_policy`
- `override_note_to_toc`
- `override_attendance_note`

**Save rule:**
- If the edited value equals the template value, store `NULL` (not duplicate text).

## Section overrides (atomic)

Each section is either:
- **Template-backed** (no override rows exist)
- **Overridden** (override rows exist and fully replace the template section)

Sections:
- Class Overview
- Division of Roles
- Opening Routine
- Lesson Flow
- Activity Options
- What to Do If…
- End of Class — Room Cleanup

## Creating overrides

When a teacher edits a section in Dayplans:
- Create/replace the override rows for that section
- Leave other sections untouched

## Reset behavior

### Reset a section to template
Action deletes override rows for that section only.

Examples:
- Reset Opening Routine → delete `toc_opening_routine_steps` for that toc_block_plan
- Reset Class Overview → delete `toc_overview_rows`

### Reset everything to template
Action:
- Set all override header fields to NULL
- Delete all override child rows for all sections

## Template edits after overrides

- If a section is not overridden, template edits appear everywhere immediately.
- If a section is overridden, template edits do not change the overridden instance.

This is the intended behavior.

## UI requirements

- Admin must always show the **effective** content.
- UI should clearly indicate when a section is overridden (optional but recommended).
- UI must provide reset controls:
  - Reset section
  - Reset all
