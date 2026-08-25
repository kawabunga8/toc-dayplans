# TOC Dayplans

Richmond Christian School's system for preparing daily lesson plans that a
substitute teacher can pick up and teach from. Staff write the plans; TOCs read
them.

## Language

### People

**Student Hub**:
The app that owns student, class and enrolment records for the whole RCS suite.
This app reads that data and never writes it. Its repository and its own docs
call it Course Hub, and it deploys to rcs-course-hub.vercel.app, but Student Hub
is what it calls itself on screen and what we call it out loud.
_Avoid_: Course Hub, course-hub, RCS-Hub, the hub, the main database

**TOC**:
A Teacher On Call: the substitute who reads a plan and teaches from it.
_Avoid_: sub, substitute, relief teacher, guest teacher

**Staff**:
An authenticated school employee who writes plans. Roles are admin, editor, and
viewer.
_Avoid_: user, teacher, admin (when you mean staff generally)

### The plan

**Dayplan**:
Everything a TOC needs for one school day: the day's blocks, their lesson
content, and the instructions wrapped around them.
_Avoid_: day plan, lesson plan, daily plan, schedule

**Block**:
One timed segment of a dayplan, tied to a class and a room.
_Avoid_: period, session, timeslot

**Shape of the day**:
A dayplan's block times, class names and rooms. Derived from the rotation and
the class timetable rather than written by staff, so it is true whether or not
a plan has been written, and is shown to TOCs even for a draft.
_Avoid_: skeleton, structure, schedule (when you mean this specifically)

**Friday type**:
Which of the two Friday rotations a date follows, day1 or day2. Required
whenever a plan falls on a Friday; rotation is empty without it.
_Avoid_: Friday rotation, day type, A/B day

### Reading plans

**View Schedule**:
The public week view where a TOC browses published dayplans. Lives at `/toc`.
_Avoid_: TOC view, TOC week view, TOC calendar, the public page

### Publishing

A dayplan is always in exactly one of three states. Saving never changes the
state; only the four transitions below do.

**Draft**:
A dayplan that has been created and saved but not yet published. This is what
every new dayplan is. A TOC cannot read a draft, but does see that one is on
its way: existence is public, content is not.
_Avoid_: private, unpublished, work in progress

**Plan coming**:
What View Schedule shows a TOC in place of a draft: the day's shape, with none
of the lesson content. Distinct from "No plan", which means nothing exists and
the TOC should not wait for one. It does not expire when the block starts,
because staff may still publish partway through a day.
_Avoid_: pending plan, draft notice, in progress

**Change coming**:
What View Schedule shows a TOC on a published plan that has unpublished
changes. The published snapshot is still shown in full; this only warns that it
may be revised.
_Avoid_: update pending, revision notice

**Published**:
A dayplan a TOC can both see in View Schedule and open. The only state in which
a TOC can read a plan. A TOC always reads the plan as it was at the moment it
was published, never the staff's current working copy.
_Avoid_: live, public, shared, visible, link

**Published snapshot**:
The frozen copy of a dayplan taken at publish time. This is what a TOC reads.
_Avoid_: payload, published_payload, the published version

**Unpublished changes**:
Edits that have been saved to a published dayplan but are not yet in its
published snapshot. Staff jargon: a TOC never sees this phrase, and never sees
the edits themselves until staff republish.
_Avoid_: pending edits, draft changes, unsaved changes, dirty

**Publish time**:
When the current published snapshot was taken. Shown to TOCs on the plan so
they know how current it is.
_Avoid_: last updated, last modified, revision date

**Trashed**:
A dayplan withdrawn from View Schedule, recoverable by staff. Not a deletion.
_Avoid_: deleted, archived, removed, unpublished

**Publish**:
Draft to Published. The single act that makes a plan readable by a TOC.

**Revoke**:
Published back to Draft. The plan keeps its content.

**Trash**:
Any state to Trashed.

**Restore**:
Trashed back to Draft. Never straight back to Published: a restored plan must be
published again deliberately.
