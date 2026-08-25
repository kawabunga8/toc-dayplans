---
status: accepted
---

# Drafts announce themselves without revealing content

View Schedule shows a TOC that a draft exists for a slot, along with the shape
of the day, while withholding every part of the plan staff have written. This
refines ADR-0001: publishing gates whether a TOC can *read* a plan, not whether
they can know one is on its way.

## Considered options

**Drafts are invisible.** The literal reading of ADR-0001, and how that ADR was
first written. Rejected because it leaves a TOC unable to tell "no plan exists,
improvise" from "a plan is coming, check back" - two situations that demand
opposite responses, only one of which is recoverable. A blank slot is silence,
and silence is indistinguishable from abandonment.

**Show the draft's content.** Rejected for the reasons in ADR-0001: staff need
somewhere to work that nobody is reading over their shoulder.

**Announce existence, withhold content.** Chosen.

## Consequences

The shape of the day is shown even for a draft. It is derived from the rotation
and the class timetable rather than written by staff, so it is already true
before anyone writes a plan, and withholding it protects nothing while leaving a
TOC unable to see their own day.

The notice does not expire when the block's start time passes. Staff may publish
or revise partway through a day, and a TOC is expected to check back; reverting
to "No plan" would tell them to stop checking at precisely the moment checking
still pays off.

This means View Schedule renders three distinct things where it currently
renders two: a published plan, a plan coming, and no plan. Today a draft is
listed as though it were a published plan and then fails to open, which is the
worst of the three.
