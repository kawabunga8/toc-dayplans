# toc-dayplans

Dayplan builder for TOCs (substitute teachers).

Requirements:
- Staff (you + office/admin) can create/edit dayplans
- TOCs have **no accounts** → access via **expiring share links** and can print
- Dayplans can include **student names + photos**

## Stack
- Next.js (App Router) + TypeScript
- Vercel hosting
- Supabase (Auth + Postgres)

## Local dev
```bash
npm install
npm run dev
```

Create a `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Supabase setup
1. Create a Supabase project
2. Run `supabase/schema.sql` in the SQL editor
3. Create staff users via Supabase Auth, then insert them into `staff_profiles`

## Public link security
Public TOC links should be validated server-side:
- token is random
- store only a hash in DB
- enforce `share_expires_at`

Do **not** enable public read access to student tables.
