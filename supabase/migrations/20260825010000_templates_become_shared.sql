-- Step 1 of 3: make TOC templates shareable (ADR-0005). Structural only.
--
-- Nothing is deleted here and no class changes which template it uses. Every
-- class ends up pointing at the template it already owned, so behaviour is
-- identical after this runs. Step 2 repoints classes onto shared templates;
-- step 3 removes what is then orphaned.

alter table class_toc_templates add column if not exists name text;

alter table classes add column if not exists toc_template_id uuid
  references class_toc_templates(id) on delete set null;

create index if not exists classes_toc_template_id_idx on classes(toc_template_id);

-- A class may own more than one template: class_id carries only a non-unique
-- index, and is_active marks the live one. Pick the newest active template per
-- class so this is deterministic rather than whichever row came back first.
update classes c
set toc_template_id = t.id
from (
  select distinct on (class_id) class_id, id
  from class_toc_templates
  where is_active
  order by class_id, updated_at desc, created_at desc, id
) t
where t.class_id = c.id
  and c.toc_template_id is null;

-- Identity used to come from the owning class. Seed each name from that class
-- so no template is nameless; step 2 renames the ones that become shared.
update class_toc_templates t
set name = c.name
from classes c
where t.class_id = c.id
  and (t.name is null or t.name = '');
