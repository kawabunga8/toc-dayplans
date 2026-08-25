-- Step 2 of 3: point classes at the eight shared templates (ADR-0005).
--
-- Still non-destructive. Templates that stop being referenced are left in place;
-- step 3 removes them, once this has been eyeballed in the app.
--
-- Blocks are matched by block_label, which is NOT unique - two Computer Studies
-- 10 classes both sit in block G - so each source template is chosen with an
-- explicit deterministic order, and every block letter is matched as a set.
--
-- Any class not named below keeps the template it already had. That is the safe
-- outcome for a class this migration was not written against: unconsolidated,
-- never mispointed.

do $$
declare
  bible_tid uuid;
  band_tid uuid;
  computers_tid uuid;
begin
  -- Block B's template is captured BEFORE anything repoints Block B, because it
  -- becomes the Band template. inferTemplateDefaults() mapped block 'B' to music
  -- and generated a full band template into a Bible class: warm-up routine,
  -- rehearsal note and music activity options. The content is good, it is simply
  -- attached to the wrong room. Block D - the actual Band class - matched no
  -- branch and got the generic default instead, so the two are swapped rather
  -- than one being written and the other discarded.
  select c.toc_template_id into band_tid
  from classes c
  where upper(c.block_label) = 'B' and c.toc_template_id is not null
  order by c.sort_order nulls last, c.id
  limit 1;

  -- Bible: blocks B and C are two sections of Biblical Perspectives 10. C's
  -- template is the good one; B's was generated as music by the old
  -- inferTemplateDefaults() block-letter mapping and tells a TOC to keep a
  -- rehearsal moving in a Bible class.
  select c.toc_template_id into bible_tid
  from classes c
  where upper(c.block_label) = 'C' and c.toc_template_id is not null
  order by c.sort_order nulls last, c.id
  limit 1;

  if bible_tid is not null then
    update classes set toc_template_id = bible_tid
    where upper(block_label) in ('B', 'C');
    update class_toc_templates set name = 'Bible', updated_at = now()
    where id = bible_tid;
  end if;

  -- Band: Block D takes over the template that was generated for Block B.
  if band_tid is not null and band_tid is distinct from bible_tid then
    update classes set toc_template_id = band_tid
    where upper(block_label) = 'D';
    update class_toc_templates set name = 'Band', updated_at = now()
    where id = band_tid;
  end if;

  -- Computers: Computer Programming 11/12 in block A, and both Computer
  -- Studies 10 classes in block G. CP 11/12's template is the one kept.
  select c.toc_template_id into computers_tid
  from classes c
  where upper(c.block_label) = 'A' and c.toc_template_id is not null
  order by c.sort_order nulls last, c.id
  limit 1;

  if computers_tid is not null then
    update classes set toc_template_id = computers_tid
    where upper(block_label) in ('A', 'G');
    update class_toc_templates set name = 'Computers', updated_at = now()
    where id = computers_tid;
  end if;
end $$;

-- The remaining six keep the template they already had; they only need naming.
-- Flex, Chapel and Lunch stay separate: three different supervision jobs, not
-- three copies of one.
update class_toc_templates t
set name = v.template_name, updated_at = now()
from classes c
join (values
  ('F',      'Worship Leadership'),
  ('CLE',    'Career Life Education'),
  ('FLEX',   'Flex'),
  ('CHAPEL', 'Chapel'),
  ('LUNCH',  'Lunch')
) as v(block, template_name) on upper(c.block_label) = v.block
where c.toc_template_id = t.id;

-- Safety net: if Block B had no template to donate, Block D keeps its own and
-- still needs naming.
update class_toc_templates t
set name = 'Band', updated_at = now()
from classes c
where c.toc_template_id = t.id
  and upper(c.block_label) = 'D'
  and (t.name is null or t.name <> 'Band');
