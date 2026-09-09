-- Today's Journal: link-based public access.
-- WARNING: anyone who can open the app can read, create, edit, and delete its data.
-- Run this entire file once in the Supabase SQL Editor.

alter table public.about_my_day_entries alter column owner_id drop not null;
alter table public.about_my_day_photos alter column owner_id drop not null;

grant select, insert, update, delete on public.about_my_day_entries to anon;
grant select, insert, update, delete on public.about_my_day_photos to anon;

drop policy if exists "Link users can read journal entries" on public.about_my_day_entries;
drop policy if exists "Link users can create journal entries" on public.about_my_day_entries;
drop policy if exists "Link users can update journal entries" on public.about_my_day_entries;
drop policy if exists "Link users can delete journal entries" on public.about_my_day_entries;

create policy "Link users can read journal entries"
  on public.about_my_day_entries for select to anon
  using (project_id = 'sam-about-my-day');

create policy "Link users can create journal entries"
  on public.about_my_day_entries for insert to anon
  with check (project_id = 'sam-about-my-day' and owner_id is null);

create policy "Link users can update journal entries"
  on public.about_my_day_entries for update to anon
  using (project_id = 'sam-about-my-day')
  with check (project_id = 'sam-about-my-day');

create policy "Link users can delete journal entries"
  on public.about_my_day_entries for delete to anon
  using (project_id = 'sam-about-my-day');

drop policy if exists "Link users can read photo metadata" on public.about_my_day_photos;
drop policy if exists "Link users can create photo metadata" on public.about_my_day_photos;
drop policy if exists "Link users can update photo metadata" on public.about_my_day_photos;
drop policy if exists "Link users can delete photo metadata" on public.about_my_day_photos;

create policy "Link users can read photo metadata"
  on public.about_my_day_photos for select to anon
  using (
    exists (
      select 1 from public.about_my_day_entries entry
      where entry.id = entry_id and entry.project_id = 'sam-about-my-day'
    )
  );

create policy "Link users can create photo metadata"
  on public.about_my_day_photos for insert to anon
  with check (
    owner_id is null
    and exists (
      select 1 from public.about_my_day_entries entry
      where entry.id = entry_id and entry.project_id = 'sam-about-my-day'
    )
  );

create policy "Link users can update photo metadata"
  on public.about_my_day_photos for update to anon
  using (
    exists (
      select 1 from public.about_my_day_entries entry
      where entry.id = entry_id and entry.project_id = 'sam-about-my-day'
    )
  )
  with check (
    exists (
      select 1 from public.about_my_day_entries entry
      where entry.id = entry_id and entry.project_id = 'sam-about-my-day'
    )
  );

create policy "Link users can delete photo metadata"
  on public.about_my_day_photos for delete to anon
  using (
    exists (
      select 1 from public.about_my_day_entries entry
      where entry.id = entry_id and entry.project_id = 'sam-about-my-day'
    )
  );

drop policy if exists "Link users can view journal photos" on storage.objects;
drop policy if exists "Link users can upload journal photos" on storage.objects;
drop policy if exists "Link users can update journal photos" on storage.objects;
drop policy if exists "Link users can delete journal photos" on storage.objects;

create policy "Link users can view journal photos"
  on storage.objects for select to anon
  using (bucket_id = 'journal-photos');

create policy "Link users can upload journal photos"
  on storage.objects for insert to anon
  with check (bucket_id = 'journal-photos' and (storage.foldername(name))[1] = 'shared');

create policy "Link users can update journal photos"
  on storage.objects for update to anon
  using (bucket_id = 'journal-photos')
  with check (bucket_id = 'journal-photos');

create policy "Link users can delete journal photos"
  on storage.objects for delete to anon
  using (bucket_id = 'journal-photos');
