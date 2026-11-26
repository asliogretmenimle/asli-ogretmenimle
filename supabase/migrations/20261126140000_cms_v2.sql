-- =============================================================================
--  Yönetim paneli v2: sayfa içerikleri, özel ders başvuruları, ziyaret analizi,
--  panelden değiştirilebilen OpenAI anahtarı.
--  Supabase → SQL Editor → tamamını çalıştırın (tekrar çalıştırmak güvenlidir).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Sayfa içerikleri (kind = 'page', ref = sayfa kimliği: home, oyunlar, yaklasim …)
-- ---------------------------------------------------------------------------
alter table public.cms_entries drop constraint if exists cms_entries_kind_check;
alter table public.cms_entries add constraint cms_entries_kind_check
  check (kind in ('activity', 'game', 'interaction', 'manipulative', 'guide', 'link', 'seo', 'page'));

-- ---------------------------------------------------------------------------
-- Gizli ayarlar (OpenAI anahtarı): hiçbir rol okuyamaz, yalnızca Edge Function (service role)
-- ---------------------------------------------------------------------------
create table if not exists public.cms_secrets (
  key              text primary key,
  value            text not null,
  updated_at       timestamptz not null default now(),
  updated_by_email text
);
alter table public.cms_secrets enable row level security;
revoke all on public.cms_secrets from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Online özel ders başvuruları
-- ---------------------------------------------------------------------------
create table if not exists public.lesson_requests (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  student_name     text not null check (char_length(student_name) between 2 and 120),
  parent_name      text not null check (char_length(parent_name) between 2 and 120),
  phone            text not null check (char_length(phone) between 10 and 20),
  grade            smallint not null check (grade between 1 and 8),
  lesson_type      text check (lesson_type in ('birebir', 'grup', 'kararsiz')),
  contact_pref     text check (contact_pref in ('whatsapp', 'arama')),
  contact_time     text check (char_length(contact_time) <= 120),
  expectations     text check (char_length(expectations) <= 3000),
  questions        text check (char_length(questions) <= 3000),
  consent          boolean not null check (consent),
  source_path      text check (char_length(source_path) <= 300),
  referrer         text check (char_length(referrer) <= 500),
  status           text not null default 'new' check (status in ('new', 'contacted', 'enrolled', 'closed')),
  admin_note       text,
  handled_at       timestamptz,
  handled_by_email text
);
create index if not exists lesson_requests_time_idx on public.lesson_requests (created_at desc);

-- Aynı numaradan kısa sürede çok başvuru gelmesin (spam)
create or replace function public.lesson_requests_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.lesson_requests where phone = new.phone and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'Bu numarayla kısa süre içinde çok sayıda başvuru yapıldı. Lütfen daha sonra tekrar deneyin.';
  end if;
  if (select count(*) from public.lesson_requests where created_at > now() - interval '1 minute') >= 20 then
    raise exception 'Şu an çok yoğunuz, lütfen biraz sonra tekrar deneyin.';
  end if;
  -- Ziyaretçi bu alanları dolduramaz
  new.status := 'new';
  new.admin_note := null;
  new.handled_at := null;
  new.handled_by_email := null;
  new.created_at := now();
  return new;
end;
$$;
drop trigger if exists lesson_requests_guard on public.lesson_requests;
create trigger lesson_requests_guard before insert on public.lesson_requests
for each row execute function public.lesson_requests_guard();

create or replace function public.lesson_requests_touch()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status or new.admin_note is distinct from old.admin_note then
    new.handled_at := now();
    new.handled_by_email := auth.jwt() ->> 'email';
  end if;
  return new;
end;
$$;
drop trigger if exists lesson_requests_touch on public.lesson_requests;
create trigger lesson_requests_touch before update on public.lesson_requests
for each row execute function public.lesson_requests_touch();

alter table public.lesson_requests enable row level security;
drop policy if exists "anyone can apply" on public.lesson_requests;
create policy "anyone can apply" on public.lesson_requests for insert to anon, authenticated with check (true);
drop policy if exists "admins read requests" on public.lesson_requests;
create policy "admins read requests" on public.lesson_requests for select using (public.is_cms_admin());
drop policy if exists "admins update requests" on public.lesson_requests;
create policy "admins update requests" on public.lesson_requests for update using (public.is_cms_admin()) with check (public.is_cms_admin());
drop policy if exists "admins delete requests" on public.lesson_requests;
create policy "admins delete requests" on public.lesson_requests for delete using (public.is_cms_admin());

grant insert on public.lesson_requests to anon, authenticated;
grant select, update, delete on public.lesson_requests to authenticated;

-- ---------------------------------------------------------------------------
-- Ziyaret analizi (çerez yok, IP saklanmaz; ziyaretçi kimliği tarayıcıda rastgele üretilir)
-- ---------------------------------------------------------------------------
create table if not exists public.page_views (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  path       text not null check (char_length(path) between 1 and 300),
  referrer   text check (char_length(referrer) <= 300),
  visitor    text not null check (char_length(visitor) between 8 and 64),
  session    text not null check (char_length(session) between 8 and 64),
  device     text check (device in ('mobile', 'tablet', 'desktop')),
  utm_source text check (char_length(utm_source) <= 100)
);
create index if not exists page_views_time_idx on public.page_views (created_at desc);
create index if not exists page_views_path_idx on public.page_views (path, created_at desc);

alter table public.page_views enable row level security;
drop policy if exists "anyone can log views" on public.page_views;
create policy "anyone can log views" on public.page_views for insert to anon, authenticated with check (true);
drop policy if exists "admins read views" on public.page_views;
create policy "admins read views" on public.page_views for select using (public.is_cms_admin());
grant insert on public.page_views to anon, authenticated;
grant select on public.page_views to authenticated;

-- Panelin analiz sayfası için özet (Türkiye saatiyle günler)
create or replace function public.cms_analytics(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_from timestamptz;
  v_prev timestamptz;
  v_out  jsonb;
begin
  if not public.is_cms_admin() then
    raise exception 'Yetkisiz';
  end if;
  p_days := greatest(1, least(coalesce(p_days, 30), 366));
  v_from := date_trunc('day', now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul' - make_interval(days => p_days - 1);
  v_prev := v_from - make_interval(days => p_days);

  select jsonb_build_object(
    'days', p_days,
    'from', v_from,
    'totals', (
      select jsonb_build_object(
        'views', count(*),
        'visitors', count(distinct visitor),
        'sessions', count(distinct session)
      ) from public.page_views where created_at >= v_from
    ),
    'previous', (
      select jsonb_build_object(
        'views', count(*),
        'visitors', count(distinct visitor),
        'sessions', count(distinct session)
      ) from public.page_views where created_at >= v_prev and created_at < v_from
    ),
    'live', (select count(distinct visitor) from public.page_views where created_at > now() - interval '5 minutes'),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day, 'views', coalesce(x.views, 0), 'visitors', coalesce(x.visitors, 0)) order by d.day)
      from generate_series((v_from at time zone 'Europe/Istanbul')::date, (now() at time zone 'Europe/Istanbul')::date, interval '1 day') as d(day)
      left join (
        select (created_at at time zone 'Europe/Istanbul')::date as day, count(*) as views, count(distinct visitor) as visitors
        from public.page_views where created_at >= v_from group by 1
      ) x on x.day = d.day::date
    ), '[]'::jsonb),
    'pages', coalesce((
      select jsonb_agg(t order by t.views desc) from (
        select path, count(*) as views, count(distinct visitor) as visitors
        from public.page_views where created_at >= v_from group by path order by count(*) desc limit 50
      ) t
    ), '[]'::jsonb),
    'sections', coalesce((
      select jsonb_agg(t order by t.views desc) from (
        select coalesce(nullif(split_part(path, '/', 2), ''), 'anasayfa') as section, count(*) as views, count(distinct visitor) as visitors
        from public.page_views where created_at >= v_from group by 1
      ) t
    ), '[]'::jsonb),
    'referrers', coalesce((
      select jsonb_agg(t order by t.views desc) from (
        select coalesce(nullif(referrer, ''), '(doğrudan)') as referrer, count(*) as views
        from public.page_views where created_at >= v_from group by 1 order by count(*) desc limit 15
      ) t
    ), '[]'::jsonb),
    'devices', coalesce((
      select jsonb_agg(t order by t.views desc) from (
        select coalesce(device, 'desktop') as device, count(*) as views, count(distinct visitor) as visitors
        from public.page_views where created_at >= v_from group by 1
      ) t
    ), '[]'::jsonb),
    'hours', coalesce((
      select jsonb_agg(t order by t.hour) from (
        select extract(hour from created_at at time zone 'Europe/Istanbul')::int as hour, count(*) as views
        from public.page_views where created_at >= v_from group by 1
      ) t
    ), '[]'::jsonb)
  ) into v_out;
  return v_out;
end;
$$;

grant execute on function public.cms_analytics(integer) to authenticated;

-- Sunucu rolü (Edge Function) için tablo izinleri
grant usage on schema public to service_role;
grant all on public.cms_secrets, public.cms_admins, public.cms_entries, public.cms_revisions,
  public.cms_settings, public.studio_sessions, public.lesson_requests, public.page_views to service_role;
grant usage, select on all sequences in schema public to service_role;
