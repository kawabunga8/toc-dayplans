---
status: accepted
---

# TOC templates belong to a kind of class, and classes point at them

A TOC template describes a kind of teaching - Bible, Band, Computers, Worship
Leadership, Career Life Education, Flex, Chapel, Lunch - and any number of
classes point at it. A class
does not own a template; it references one. Previously each class owned its own,
via `class_toc_templates.class_id`.

## Considered options

**Keyed to the course.** The obvious reading of "the template should follow the
course, not the block", and it fixes the case that prompted this: Biblical
Perspectives 10 runs in Block B and Block C, each with its own template, and the
two drifted until Block B's note told a TOC to "keep the rehearsal moving" in a
Bible class. Rejected because a third of the timetable has no single course to
follow. Band 10-12 is one class drawing three courses; CP 11/12 and WL 11/12
draw two each; and Flex, Lunch and Chapel draw none at all while still needing
templates. Career Life Education is a course, despite the schema seeding it
alongside them as a "non-course" block.

**Keyed to the class, as before.** Rejected: it is what allowed the drift, and it
makes every new class start from a blank template.

**A shared template a class points at.** Chosen. It covers all three shapes -
several classes of one course, one class of several courses, and a class with no
course - without any of them being a special case.

## Consequences

Roughly a dozen per-class templates collapse into eight shared ones, which is
the point: the same instructions cannot diverge between two sections of the same
course, because there is only one copy to edit.

Flex, Chapel and Lunch stay three templates rather than one "non-course"
template. They are not duplicates of each other: lunch supervision, chapel
supervision and flex supervision are three different jobs, and the chapel note
carries an operational detail - Worship Leadership students pack up afterwards -
that nothing else would tell a TOC. Sharing is for stopping copies drifting
apart, not for flattening things that genuinely differ.

Templates need names now. Identity used to come from the owning class, and a
shared template has no owning class to borrow a name from.

The eight `class_*` child tables already reference `class_toc_templates(id)`, so
the template tree is self-contained and only `class_toc_templates.class_id`
moves. The table names still say `class_`, which is now inaccurate; renaming
them was judged more disruptive than the inaccuracy.

The Band template is Block B's. `inferTemplateDefaults()` mapped block letters to
kinds of teaching, and its mapping had gone stale: it believed block B was music,
so it generated a complete band template - warm-up routine, rehearsal note, music
activity options - into Biblical Perspectives 10. Block D, the actual Band class,
matched no branch and received the generic default. The two are therefore
swapped: Block D takes the band content, and Blocks B and C share Block C's
Bible template, which is correct precisely because it fell through to the
generic default. Nothing is rewritten by hand; the content was already right,
only attached to the wrong room.

Merging existing templates destroys content: three separate Computers templates
become one, and Block D's generic template is discarded. That is a content
decision, made once, and it needs a database backup first - in a project shared
with the Report Card Tool (ADR-0004).

Fixing a template does not reach plans already published. Under ADR-0002 the old
content is frozen in each published snapshot until the plan is republished.
