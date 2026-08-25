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

The authoritative cross-app map is `ARCHITECTURE.md` in the Course Hub repo,
which tracks the shared model and the known problems in it. It lives there
because Course Hub owns the data; it was previously in CourseBoard, which reads
the database and never writes to it. Prefer it over anything inferred from this
repo alone; where the two disagree, it wins.

## Consequences

`supabase/schema.sql` is not safe to run as a whole against the live database,
and `CLAUDE.md` currently tells you to do exactly that after deploying. Two
separate reasons:

It declares `create table if not exists students`, `classes` and `enrolments`.
On the live database the guard makes them no-ops, which is the only reason this
has not caused damage.

Ownership is muddier than "Student Hub owns it", and worth stating exactly, by
which app actually writes each table:

| Table | Written by |
| --- | --- |
| `students` | Student Hub, this app, the Report Card Tool |
| `courses` | Student Hub, the Report Card Tool |
| `enrolments` | Student Hub, this app, the Report Card Tool |
| `learning_standards` | Student Hub, this app, the Report Card Tool |
| `school_quarters` | Student Hub, this app |
| `classes` | **this app only** - Student Hub merely reads it |
| `student_marks`, `student_notes` | Student Hub |

The intended rule is that data flows from Student Hub and everything else reads.
Five of the eight shared tables have more than one writer, so the rule is a goal
rather than a description. `classes` is the inversion: Student Hub's own
documentation claims to manage it, and it is the one table Student Hub never
writes.

`classes` is also scheduled to disappear. Course Hub's `ARCHITECTURE.md` retires
it in favour of `courses` plus a teaching group, which is the fix for this app
listing every class from every year: a class has no school year, so the TOC week
view shows blocks that no longer exist.

It also holds the superseded Rule A body of `get_public_plans_for_week`, so
running it would overwrite the publish-gated function that ADR-0001 requires and
silently reintroduce the bug.

Anything run in the SQL editor lands in whatever schema `search_path` points at.
Two of this app's functions, `get_public_plans_for_week` and
`resolve_day_plan_payload`, already exist as stray copies in `rcs`, called by
neither app. Before dropping anything from `rcs`, confirm it is not the Report
Card Tool's: that schema holds roughly sixty-six live objects.
