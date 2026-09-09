-- Today's Journal: secure centralized storage for one authorized user.
-- Run this entire file once in the Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.about_my_day_entries (
  id text primary key,
  project_id text not null,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  child_name text not null,
  staff_initials text not null default '',
  blocks jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists about_my_day_entries_owner_date_idx
  on public.about_my_day_entries (owner_id, date desc);

create table if not exists public.about_my_day_photos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entry_id text not null references public.about_my_day_entries(id) on delete cascade,
  block_index smallint not null check (block_index between 0 and 3),
  storage_path text not null unique,
  original_name text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists about_my_day_photos_entry_idx
  on public.about_my_day_photos (owner_id, entry_id, created_at);

alter table public.about_my_day_entries enable row level security;
alter table public.about_my_day_photos enable row level security;

revoke all on public.about_my_day_entries from anon;
revoke all on public.about_my_day_photos from anon;
grant select, insert, update, delete on public.about_my_day_entries to authenticated;
grant select, insert, update, delete on public.about_my_day_photos to authenticated;

drop policy if exists "Authorized journal user can read entries" on public.about_my_day_entries;
drop policy if exists "Authorized journal user can create entries" on public.about_my_day_entries;
drop policy if exists "Authorized journal user can update entries" on public.about_my_day_entries;
drop policy if exists "Authorized journal user can delete entries" on public.about_my_day_entries;

create policy "Authorized journal user can read entries"
  on public.about_my_day_entries for select to authenticated
  using (
    owner_id = (select auth.uid())
    and lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'bemnetgizachew@gmail.com'
  );

create policy "Authorized journal user can create entries"
  on public.about_my_day_entries for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'bemnetgizachew@gmail.com'
  );

create policy "Authorized journal user can update entries"
  on public.about_my_day_entries for update to authenticated
  using (
    owner_id = (select auth.uid())
    and lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'bemnetgizachew@gmail.com'
  )
  with check (
    owner_id = (select auth.uid())
    and lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'bemnetgizachew@gmail.com'
  );

create policy "Authorized journal user can delete entries"
  on public.about_my_day_entries for delete to authenticated
  using (
    owner_id = (select auth.uid())
    and lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'bemnetgizachew@gmail.com'
  );

drop policy if exists "Authorized journal user can read photo metadata" on public.about_my_day_photos;
drop policy if exists "Authorized journal user can create photo metadata" on public.about_my_day_photos;
drop policy if exists "Authorized journal user can update photo metadata" on public.about_my_day_photos;
drop policy if exists "Authorized journal user can delete photo metadata" on public.about_my_day_photos;

create policy "Authorized journal user can read photo metadata"
  on public.about_my_day_photos for select to authenticated
  using (
    owner_id = (select auth.uid())
    and lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'bemnetgizachew@gmail.com'
  );

create policy "Authorized journal user can create photo metadata"
  on public.about_my_day_photos for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'bemnetgizachew@gmail.com'
  );

create policy "Authorized journal user can update photo metadata"
  on public.about_my_day_photos for update to authenticated
  using (
    owner_id = (select auth.uid())
    and lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'bemnetgizachew@gmail.com'
  )
  with check (
    owner_id = (select auth.uid())
    and lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'bemnetgizachew@gmail.com'
  );

create policy "Authorized journal user can delete photo metadata"
  on public.about_my_day_photos for delete to authenticated
  using (
    owner_id = (select auth.uid())
    and lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'bemnetgizachew@gmail.com'
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'journal-photos',
  'journal-photos',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authorized journal user can view photos" on storage.objects;
drop policy if exists "Authorized journal user can upload photos" on storage.objects;
drop policy if exists "Authorized journal user can update photos" on storage.objects;
drop policy if exists "Authorized journal user can delete photos" on storage.objects;

create policy "Authorized journal user can view photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'journal-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'bemnetgizachew@gmail.com'
  );

create policy "Authorized journal user can upload photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'journal-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'bemnetgizachew@gmail.com'
  );

create policy "Authorized journal user can update photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'journal-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'bemnetgizachew@gmail.com'
  )
  with check (
    bucket_id = 'journal-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'bemnetgizachew@gmail.com'
  );

create policy "Authorized journal user can delete photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'journal-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'bemnetgizachew@gmail.com'
  );
