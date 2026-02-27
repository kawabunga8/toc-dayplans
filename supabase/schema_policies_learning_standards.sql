-- Run this after schema.sql if you want to add RLS policies for learning standards tables.
-- Included as a separate patch because schema.sql may already be applied in production.

alter table learning_standards enable row level security;
alter table learning_standard_levels enable row level security;

-- learning_standards
create policy "learning_standards_staff_select" on learning_standards
for select using (is_staff());
create policy "learning_standards_staff_insert" on learning_standards
for insert with check (can_write());
create policy "learning_standards_staff_update" on learning_standards
for update using (can_write()) with check (can_write());
create policy "learning_standards_staff_delete" on learning_standards
for delete using (can_write());

-- learning_standard_levels
create policy "learning_standard_levels_staff_select" on learning_standard_levels
for select using (is_staff());
create policy "learning_standard_levels_staff_insert" on learning_standard_levels
for insert with check (can_write());
create policy "learning_standard_levels_staff_update" on learning_standard_levels
for update using (can_write()) with check (can_write());
create policy "learning_standard_levels_staff_delete" on learning_standard_levels
for delete using (can_write());
