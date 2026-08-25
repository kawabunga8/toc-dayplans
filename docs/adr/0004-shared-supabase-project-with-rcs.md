---
status: accepted
---

# This app shares one Supabase project with the rest of the RCS suite

TOC Dayplans is one of several personal teaching apps for a single teacher at
RCS, and they all share one Supabase project. Student Hub is the system of
record: it owns students, courses, enrolments and quarters, and the other apps
read that data rather than keeping their own. This app contributes the dayplan
domain (`day_plans`, `day_plan_blocks`, `toc_block_plans`, the `class_*`
templates and the `toc_*` instances) to the same `public` schema, alongside
tables it consumes but does not own.

A second schema, `rcs`, is used by the Report Card Tool, which reaches it
explicitly with `supabase.schema('rcs')`. This app never leaves `public`.

The authoritative cross-app map is `ARCHITECTURE.md` in the CourseBoard repo,
which tracks the shared model and the known problems in it. Prefer it over
anything inferred from this repo alone; where the two disagree, it wins.

## Consequences

`supabase/schema.sql` is not safe to run as a whole against the live database,
and `CLAUDE.md` currently tells you to do exactly that after deploying. Two
separate reasons:

It declares `create table if not exists students`, `classes` and `enrolments`.
Those are Student Hub's tables. On the live database the guard makes them no-ops,
which is the only reason this has not caused damage, but the file reads as though
this app owns data it merely borrows.

It also holds the superseded Rule A body of `get_public_plans_for_week`, so
running it would overwrite the publish-gated function that ADR-0001 requires and
silently reintroduce the bug.

Anything run in the SQL editor lands in whatever schema `search_path` points at.
Two of this app's functions, `get_public_plans_for_week` and
`resolve_day_plan_payload`, already exist as stray copies in `rcs`, called by
neither app. Before dropping anything from `rcs`, confirm it is not the Report
Card Tool's: that schema holds roughly sixty-six live objects.
