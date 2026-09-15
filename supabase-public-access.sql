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

-- Daily app opening/closing totals. The table itself is not readable by anon;
-- the app uses the restricted reporting function below for privileged viewers.
create table if not exists public.journal_access_stats (
  project_id text not null,
  date date not null,
  username text not null,
  opens integer not null default 0 check (opens >= 0),
  closes integer not null default 0 check (closes >= 0),
  last_opened_at timestamptz,
  last_closed_at timestamptz,
  primary key (project_id, date, username)
);

alter table public.journal_access_stats enable row level security;
revoke all on public.journal_access_stats from anon, authenticated;

create table if not exists public.journal_stats_viewers (
  username text primary key,
  role text not null check (role in ('admin', 'superuser'))
);

alter table public.journal_stats_viewers enable row level security;
revoke all on public.journal_stats_viewers from anon, authenticated;
insert into public.journal_stats_viewers (username, role)
values ('BAlemayehu', 'superuser')
on conflict (username) do update set role = excluded.role;

create or replace function public.record_journal_access(
  p_project_id text,
  p_username text,
  p_event text,
  p_occurred_at timestamptz,
  p_local_date date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_project_id <> 'sam-about-my-day'
     or p_event not in ('open', 'close')
     or lower(p_username) not in (
       'jkarim', 'amamo', 'balemayehu', 'sgebreyes', 'gchere', 'talemayehu', 'aalemayehu'
     ) then
    raise exception 'Invalid access event';
  end if;

  insert into public.journal_access_stats (
    project_id, date, username, opens, closes, last_opened_at, last_closed_at
  ) values (
    p_project_id,
    p_local_date,
    p_username,
    case when p_event = 'open' then 1 else 0 end,
    case when p_event = 'close' then 1 else 0 end,
    case when p_event = 'open' then p_occurred_at else null end,
    case when p_event = 'close' then p_occurred_at else null end
  )
  on conflict (project_id, date, username) do update set
    opens = journal_access_stats.opens + case when p_event = 'open' then 1 else 0 end,
    closes = journal_access_stats.closes + case when p_event = 'close' then 1 else 0 end,
    last_opened_at = case when p_event = 'open' then p_occurred_at else journal_access_stats.last_opened_at end,
    last_closed_at = case when p_event = 'close' then p_occurred_at else journal_access_stats.last_closed_at end;
end;
$$;

create or replace function public.get_journal_access_stats(
  p_project_id text,
  p_requesting_username text,
  p_since date
)
returns table (date date, username text, opens integer, closes integer)
language sql
security definer
set search_path = public
as $$
  select stats.date, stats.username, stats.opens, stats.closes
  from public.journal_access_stats stats
  where stats.project_id = p_project_id
    and stats.date >= p_since
    and exists (
      select 1 from public.journal_stats_viewers viewer
      where lower(viewer.username) = lower(p_requesting_username)
        and viewer.role in ('admin', 'superuser')
    )
  order by stats.date desc, stats.username;
$$;

revoke all on function public.record_journal_access(text, text, text, timestamptz, date) from public;
revoke all on function public.get_journal_access_stats(text, text, date) from public;
grant execute on function public.record_journal_access(text, text, text, timestamptz, date) to anon;
grant execute on function public.get_journal_access_stats(text, text, date) to anon;

-- Detailed usage events. Event IDs make retries safe, while session IDs connect
-- an opening with its closing event so active time can be calculated.
create table if not exists public.journal_access_events (
  id text primary key,
  project_id text not null,
  session_id text not null,
  username text not null,
  event_type text not null check (event_type in ('open', 'close', 'view')),
  event_at timestamptz not null,
  local_date date not null,
  viewed_date date,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  timezone text not null default '',
  device_type text not null default '',
  browser text not null default '',
  platform text not null default ''
);

create index if not exists journal_access_events_project_date_idx
  on public.journal_access_events (project_id, local_date desc, event_at desc);
create index if not exists journal_access_events_session_idx
  on public.journal_access_events (session_id, event_at);

alter table public.journal_access_events enable row level security;
revoke all on public.journal_access_events from anon, authenticated;

create or replace function public.record_journal_access_detail(
  p_event_id text,
  p_session_id text,
  p_project_id text,
  p_username text,
  p_event text,
  p_occurred_at timestamptz,
  p_local_date date,
  p_viewed_date date,
  p_timezone text,
  p_device_type text,
  p_browser text,
  p_platform text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  calculated_duration integer := null;
  inserted_rows integer := 0;
begin
  if p_project_id <> 'sam-about-my-day'
     or p_event not in ('open', 'close', 'view')
     or lower(p_username) not in (
       'jkarim', 'amamo', 'balemayehu', 'sgebreyes', 'gchere', 'talemayehu', 'aalemayehu'
     ) then
    raise exception 'Invalid access event';
  end if;

  if p_event = 'close' then
    select greatest(0, round(extract(epoch from (p_occurred_at - min(event_at))))::integer)
      into calculated_duration
    from public.journal_access_events
    where project_id = p_project_id
      and session_id = p_session_id
      and username = p_username
      and event_type = 'open';
  end if;

  insert into public.journal_access_events (
    id, project_id, session_id, username, event_type, event_at, local_date,
    viewed_date, duration_seconds, timezone, device_type, browser, platform
  ) values (
    p_event_id, p_project_id, p_session_id, p_username, p_event, p_occurred_at,
    p_local_date, p_viewed_date, calculated_duration, left(coalesce(p_timezone, ''), 100),
    left(coalesce(p_device_type, ''), 40), left(coalesce(p_browser, ''), 80),
    left(coalesce(p_platform, ''), 100)
  ) on conflict (id) do nothing;

  get diagnostics inserted_rows = row_count;
  if inserted_rows = 0 or p_event = 'view' then return; end if;

  insert into public.journal_access_stats (
    project_id, date, username, opens, closes, last_opened_at, last_closed_at
  ) values (
    p_project_id, p_local_date, p_username,
    case when p_event = 'open' then 1 else 0 end,
    case when p_event = 'close' then 1 else 0 end,
    case when p_event = 'open' then p_occurred_at else null end,
    case when p_event = 'close' then p_occurred_at else null end
  )
  on conflict (project_id, date, username) do update set
    opens = journal_access_stats.opens + case when p_event = 'open' then 1 else 0 end,
    closes = journal_access_stats.closes + case when p_event = 'close' then 1 else 0 end,
    last_opened_at = case when p_event = 'open' then p_occurred_at else journal_access_stats.last_opened_at end,
    last_closed_at = case when p_event = 'close' then p_occurred_at else journal_access_stats.last_closed_at end;
end;
$$;

create or replace function public.get_journal_access_details(
  p_project_id text,
  p_requesting_username text,
  p_since date
)
returns table (
  id text, session_id text, username text, event_type text, event_at timestamptz,
  local_date date, viewed_date date, duration_seconds integer, timezone text,
  device_type text, browser text, platform text
)
language sql
security definer
set search_path = public
as $$
  select events.id, events.session_id, events.username, events.event_type,
    events.event_at, events.local_date, events.viewed_date, events.duration_seconds,
    events.timezone, events.device_type, events.browser, events.platform
  from public.journal_access_events events
  where events.project_id = p_project_id
    and events.local_date >= p_since
    and exists (
      select 1 from public.journal_stats_viewers viewer
      where lower(viewer.username) = lower(p_requesting_username)
        and viewer.role in ('admin', 'superuser')
    )
  order by events.event_at desc
  limit 5000;
$$;

revoke all on function public.record_journal_access_detail(text, text, text, text, text, timestamptz, date, date, text, text, text, text) from public;
revoke all on function public.get_journal_access_details(text, text, date) from public;
grant execute on function public.record_journal_access_detail(text, text, text, text, text, timestamptz, date, date, text, text, text, text) to anon;
grant execute on function public.get_journal_access_details(text, text, date) to anon;
