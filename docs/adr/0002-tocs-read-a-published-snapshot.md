---
status: accepted
---

# TOCs read a published snapshot, not live data

A TOC always reads a dayplan as it was at the moment staff published it. Edits
made afterwards are held back until staff publish again. This reverses the
change recorded in `AUDIT.md`, where `/p/[id]` moved from the stored snapshot to
a live resolver so that a plan "always reflects current data".

## Considered options

**Live rendering.** A TOC always sees the newest content, and staff never have
to remember a second click. Rejected because it makes publishing a gate on first
visibility only: after that, every saved keystroke is live. A teacher tidying
Tuesday's plan at 7am is editing a document a TOC may be reading at 7:05, and
there is no moment at which staff can say "this is ready for someone else to
teach from".

**Published snapshot.** Chosen. Publishing is the editorial act, and it is the
only thing that changes what a TOC sees.

## Consequences

Staff can now have work in progress on an already-published plan. That state is
called unpublished changes, and staff are actively reminded to publish them
rather than merely shown an indicator they can learn to ignore; a TOC is never
shown the phrase, and never sees the edits. Nothing else in the system tells the
one person who can fix a stale plan that it is stale, and under ADR-0003 a TOC
who sees a plan coming will wait rather than improvise, so the reminder is what
makes that wait safe. TOCs instead see the publish time, so they
can judge how current the plan is. Certainty is worth more to someone teaching
an unfamiliar class in ten minutes than a warning they cannot act on.

Detecting unpublished changes cannot rely on `day_plans.updated_at`. A dayplan's
content is spread across roughly fifteen tables, and the editors write to the
`toc_*` tables without touching the `day_plans` row at all, so that timestamp
moves only when someone edits a plan's title, notes or focus fields.

Class templates are frozen into the snapshot along with everything else. Editing
a template therefore changes nothing for plans already published until each is
republished, which is correct for a snapshot but is the opposite of what
"template" suggests.
