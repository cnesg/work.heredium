-- Run this once in Supabase: Project -> SQL Editor -> New query -> paste -> Run

create table if not exists heredium_data (
  id bigint generated always as identity primary key,
  project_id text not null,
  section text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (project_id, section)
);

alter table heredium_data enable row level security;

-- NOTE: this policy allows anyone with the anon key (i.e. anyone who can load
-- the deployed site) to read and write. That's fine for an internal team tool
-- with no public link, but do NOT reuse this policy if the site becomes public.
create policy "internal team read/write"
on heredium_data
for all
using (true)
with check (true);

-- Storage bucket for uploaded files (posters, photos, press drafts, cover images)
insert into storage.buckets (id, name, public)
values ('heredium-files', 'heredium-files', true)
on conflict (id) do nothing;

create policy "heredium files read/write"
on storage.objects
for all
using (bucket_id = 'heredium-files')
with check (bucket_id = 'heredium-files');
