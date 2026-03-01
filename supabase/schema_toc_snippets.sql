-- TOC Snippet Library
-- Structured content blocks that can be inserted into a Day Override (toc_* tables)

create table if not exists public.toc_snippets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  tags text[] not null default '{}'::text[],
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.toc_snippets enable row level security;

drop policy if exists "toc_snippets_staff_select" on public.toc_snippets;
drop policy if exists "toc_snippets_staff_insert" on public.toc_snippets;
drop policy if exists "toc_snippets_staff_update" on public.toc_snippets;
drop policy if exists "toc_snippets_staff_delete" on public.toc_snippets;

create policy "toc_snippets_staff_select" on public.toc_snippets
for select using (is_staff());

create policy "toc_snippets_staff_insert" on public.toc_snippets
for insert with check (can_write());

create policy "toc_snippets_staff_update" on public.toc_snippets
for update using (can_write()) with check (can_write());

create policy "toc_snippets_staff_delete" on public.toc_snippets
for delete using (can_write());

-- Seed snippets (idempotent by title)
-- NOTE: These are starter snippets derived from TOC PDFs.
insert into public.toc_snippets (title, description, tags, payload)
select * from (
  values
  (
    'Protocols + Digital Workflow (Starter)',
    'General opening protocols + digital workflow reminders (attendance/prayer, device policy, Teams/OneNote).',
    array['general','protocols','workflow'],
    jsonb_build_object(
      'opening_steps', jsonb_build_array(
        'Attendance + opening prayer',
        'Phones away unless explicitly needed',
        'No food unless permission granted',
        'Open Microsoft Teams (assignments/files/videos)',
        'Open OneNote Class Notebook (work space)'
      )
    )
  ),
  (
    'Band Routine (Starter)',
    'Band class routine: unpack, independent scale practice, structured warm-up.',
    array['FA','band','routine'],
    jsonb_build_object(
      'opening_steps', jsonb_build_array(
        'Arrive, unpack instruments, set up stands',
        '5–10 min independent scale practice',
        'Attendance (TA/TOC) + collect practice sheets (if applicable)'
      ),
      'lesson_flow_phases', jsonb_build_array(
        jsonb_build_object('time_text','15–20 min','phase_text','Formal warm-up','activity_text','Student-led full-band scales + rhythm reading','purpose_text','Establish tone/technique; align ensemble')
      )
    )
  ),
  (
    'Biblical Perspectives Lesson Flow (Starter)',
    'BP flow: opening prayer, recall/check-in, video + note-taking + reflection.',
    array['Bible','bp','routine'],
    jsonb_build_object(
      'opening_steps', jsonb_build_array(
        'Attendance + opening prayer',
        'OneNote Recall (key ideas/questions from previous class)',
        'Quick check-in question to prime the topic'
      ),
      'lesson_flow_phases', jsonb_build_array(
        jsonb_build_object('time_text','—','phase_text','Video + notes','activity_text','Watch assigned teaching video; take notes in OneNote','purpose_text','Build shared understanding'),
        jsonb_build_object('time_text','—','phase_text','Discussion','activity_text','Small-group or whole-class discussion prompts','purpose_text','Connect ideas; practice respectful dialogue'),
        jsonb_build_object('time_text','—','phase_text','Reflection/Prayer','activity_text','Written reflection + closing prayer','purpose_text','Personal application')
      )
    )
  ),
  (
    'Programming: Digital Workshop Block (Starter)',
    'Programming block routine: log in, self-paced modules, collaborative debugging.',
    array['ADST','programming','routine'],
    jsonb_build_object(
      'opening_steps', jsonb_build_array(
        'Attendance + opening prayer',
        'Devices out; phones away',
        'Log into required platforms (CMU, GitHub, Teams)'
      ),
      'lesson_flow_phases', jsonb_build_array(
        jsonb_build_object('time_text','—','phase_text','Hook/Check-in','activity_text','Quick prompt about design choices / UX / debugging','purpose_text','Prime thinking'),
        jsonb_build_object('time_text','—','phase_text','Core work block','activity_text','Self-paced coding module work (independent/collab)','purpose_text','Practice + progress'),
        jsonb_build_object('time_text','—','phase_text','Support + conferencing','activity_text','Teacher/TOC circulates; targeted help + check-ins','purpose_text','Unblock students')
      )
    )
  )
) as v(title, description, tags, payload)
where not exists (select 1 from public.toc_snippets s where s.title = v.title);
