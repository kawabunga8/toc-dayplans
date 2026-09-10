-- Remove get_public_classes from the rcs schema, where it should never have
-- been created.
--
-- 20260909120000 and ...130000 declared the function unqualified. This database
-- also hosts the Report Card Tool's rcs schema, and the SQL Editor's search_path
-- puts rcs first, so the unqualified `drop function get_public_classes()` removed
-- the real one from public and the unqualified `create` put the replacement in
-- rcs. PostgREST only resolves public, so it stopped finding the function
-- entirely and the TOC page failed to load.
--
-- Verification inside the SQL Editor did not catch it: the same search_path
-- resolved calls to the rcs copy, so the function returned correct results while
-- the application could not reach it at all. ADR-0004 warns about exactly this,
-- which is why get_public_plans_for_week is schema-qualified.
--
-- Both earlier migrations are now schema-qualified. This drops the stray copy so
-- a lookup can never resolve to it.

drop function if exists rcs.get_public_classes(date);
drop function if exists rcs.get_public_classes();

notify pgrst, 'reload schema';
