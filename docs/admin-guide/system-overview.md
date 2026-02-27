# System Overview

## Core objects

- **Classes** (`classes`): courses/rooms plus special blocks (Flex/Chapel/Lunch/CLE)
- **TOC Templates** (`class_toc_templates` + child tables): reusable default content per class
- **Dayplans** (`day_plans`): per-date plans; can be published as a link
- **Schedule Blocks** (`day_plan_blocks`): the block entry for a dayplan
- **TOC Block Plan instances** (`toc_block_plans` + child tables): per-block, per-date editable plan content

## How content flows

1. A class has an active TOC Template.
2. A dayplan is opened/created for a date + slot.
3. A schedule block is generated (links to a class).
4. A TOC Block Plan instance is created if missing.
5. If the instance is empty, it copies content from the active class template.

Templates are never overwritten by dayplan edits.
