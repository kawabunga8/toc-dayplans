---
status: accepted
refined-by: ADR-0003
---

# Publishing gates TOC visibility, not trashing

A dayplan is readable by a TOC only once staff explicitly publish it. Saving a
dayplan leaves it a Draft, invisible in View Schedule and unopenable. This
reverses "Rule A", recorded in `AUDIT.md`, under which View Schedule listed
every non-trashed plan and ignored the published state entirely.

## Considered options

**Rule A: any non-trashed plan is visible.** One field to reason about, and it
sidesteps the brittle "is this published" heuristics that the SQL functions had
grown. Rejected because it leaves staff no way to work on a plan privately: a
half-written Thursday plan would be readable by any TOC from the moment it was
first saved, and the only way to hide work in progress would be to trash it.

**Publish as an explicit gate.** Chosen. Staff decide when a plan is fit for
someone else to teach from, which is the actual editorial moment the workflow
is built around.

## Consequences

Rule A was only ever half-implemented, and the half that shipped was the
listing. The plan list obeyed Rule A while the plan detail page required a
published plan, so a saved-but-unpublished dayplan appeared in View Schedule and
returned 404 when a TOC opened it. Restoring a trashed plan produced the same
split, because trashing cleared the published state and restoring did not put it
back.

Making publishing the gate means the listing is the side that has to change:
View Schedule and the week query must require a published plan, matching the
detail page and the other public functions, which already did.

Restore deliberately returns a plan to Draft rather than Published. Staff
republish on purpose, so an accidental trash-then-restore cannot silently put
stale content back in front of a TOC.
