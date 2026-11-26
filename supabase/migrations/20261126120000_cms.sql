-- =============================================================================
--  Aslı Öğretmenimle · Yönetim paneli (CMS) şeması
--
--  Sitedeki içerik kodda (src/data, src/games, src/interactions …) durur. Bu tablolar
--  o içeriğin ÜSTÜNE uygulanan değişiklikleri tutar:
--    origin = 'builtin' → koddaki bir öğenin düzenlenmiş alanları (data) ya da gizlenmesi (hidden)
--    origin = 'custom'  → panelden / Stüdyo'dan eklenen yeni öğe (data + gerekirse html)
--  Site açılışta yayınlanmış kayıtları okur ve listelere uygular (src/cms/overlay.ts).
--
--  Kurulum: Supabase → SQL Editor → bu dosyanın tamamını yapıştırıp çalıştırın.
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Yöneticiler
-- ---------------------------------------------------------------------------
create table if not exists public.cms_admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  role       text not null default 'editor' check (role in ('owner', 'editor')),
  created_at timestamptz not null default now()
);

create or replace function public.is_cms_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.cms_admins where user_id = auth.uid());
$$;

create or replace function public.is_cms_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.cms_admins where user_id = auth.uid() and role = 'owner');
$$;

-- Hiç yönetici yoksa giriş yapan ilk kullanıcı kendini "owner" yapabilir (ilk kurulum)
create or replace function public.claim_first_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Giriş yapılmamış';
  end if;
  if exists (select 1 from public.cms_admins) then
    return false;
  end if;
  insert into public.cms_admins (user_id, email, role)
  values (auth.uid(), coalesce(auth.jwt() ->> 'email', ''), 'owner');
  return true;
end;
$$;

create or replace function public.cms_has_admins()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.cms_admins);
$$;

-- Owner, panele kayıt olmuş bir kullanıcıyı e-postasıyla yönetici yapar
create or replace function public.add_cms_admin(p_email text, p_role text default 'editor')
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_cms_owner() then
    raise exception 'Bu işlem için yetkiniz yok';
  end if;
  select id into v_id from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if v_id is null then
    return 'not_found';
  end if;
  insert into public.cms_admins (user_id, email, role)
  values (v_id, lower(trim(p_email)), case when p_role = 'owner' then 'owner' else 'editor' end)
  on conflict (user_id) do update set role = excluded.role;
  return 'ok';
end;
$$;

create or replace function public.remove_cms_admin(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_cms_owner() then
    raise exception 'Bu işlem için yetkiniz yok';
  end if;
  if p_user = auth.uid() then
    raise exception 'Kendinizi silemezsiniz';
  end if;
  delete from public.cms_admins where user_id = p_user;
end;
$$;

alter table public.cms_admins enable row level security;
drop policy if exists "admins read admins" on public.cms_admins;
create policy "admins read admins" on public.cms_admins for select using (public.is_cms_admin());

-- ---------------------------------------------------------------------------
-- İçerik kayıtları
-- ---------------------------------------------------------------------------
create table if not exists public.cms_entries (
  id               uuid primary key default gen_random_uuid(),
  kind             text not null check (kind in ('activity', 'game', 'interaction', 'manipulative', 'guide', 'link', 'seo')),
  -- Yerleşik öğenin kimliği (ör. "balon", "g3-tek-cift", "/oyunlar") ya da yeni öğenin URL kısa adı
  ref              text not null,
  origin           text not null default 'builtin' check (origin in ('builtin', 'custom')),
  status           text not null default 'published' check (status in ('published', 'draft')),
  hidden           boolean not null default false,
  data             jsonb not null default '{}'::jsonb,
  -- Stüdyo'da üretilen oyun / etkileşim / manipülatifin tek dosyalık HTML'i
  html             text,
  grade            smallint check (grade between 1 and 8),
  note             text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  updated_by       uuid references auth.users (id) on delete set null,
  updated_by_email text,
  unique (kind, ref)
);

create index if not exists cms_entries_status_idx on public.cms_entries (status);
create index if not exists cms_entries_kind_idx on public.cms_entries (kind, grade);

create or replace function public.cms_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  new.updated_by_email := coalesce(auth.jwt() ->> 'email', new.updated_by_email);
  return new;
end;
$$;

drop trigger if exists cms_entries_touch on public.cms_entries;
create trigger cms_entries_touch before insert or update on public.cms_entries
for each row execute function public.cms_touch();

alter table public.cms_entries enable row level security;
drop policy if exists "public reads published" on public.cms_entries;
create policy "public reads published" on public.cms_entries for select using (status = 'published' or public.is_cms_admin());
drop policy if exists "admins insert" on public.cms_entries;
create policy "admins insert" on public.cms_entries for insert with check (public.is_cms_admin());
drop policy if exists "admins update" on public.cms_entries;
create policy "admins update" on public.cms_entries for update using (public.is_cms_admin()) with check (public.is_cms_admin());
drop policy if exists "admins delete" on public.cms_entries;
create policy "admins delete" on public.cms_entries for delete using (public.is_cms_admin());

-- ---------------------------------------------------------------------------
-- Değişiklik geçmişi (her kayıt/silme otomatik yazılır, geri alma için)
-- ---------------------------------------------------------------------------
create table if not exists public.cms_revisions (
  id         bigint generated always as identity primary key,
  entry_id   uuid,
  kind       text not null,
  ref        text not null,
  action     text not null,
  snapshot   jsonb,
  created_at timestamptz not null default now(),
  created_by uuid,
  created_by_email text
);
create index if not exists cms_revisions_entry_idx on public.cms_revisions (entry_id, created_at desc);
create index if not exists cms_revisions_time_idx on public.cms_revisions (created_at desc);

create or replace function public.cms_log_revision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.cms_entries;
  v_action text;
begin
  if tg_op = 'DELETE' then
    v_row := old;
    v_action := 'delete';
  else
    v_row := new;
    v_action := case
      when tg_op = 'INSERT' then 'create'
      when new.hidden and not old.hidden then 'hide'
      when not new.hidden and old.hidden then 'restore'
      when new.status <> old.status then new.status
      else 'update'
    end;
  end if;
  insert into public.cms_revisions (entry_id, kind, ref, action, snapshot, created_by, created_by_email)
  values (v_row.id, v_row.kind, v_row.ref, v_action, to_jsonb(v_row), auth.uid(), auth.jwt() ->> 'email');
  return null;
end;
$$;

drop trigger if exists cms_entries_log on public.cms_entries;
create trigger cms_entries_log after insert or update or delete on public.cms_entries
for each row execute function public.cms_log_revision();

alter table public.cms_revisions enable row level security;
drop policy if exists "admins read revisions" on public.cms_revisions;
create policy "admins read revisions" on public.cms_revisions for select using (public.is_cms_admin());

-- ---------------------------------------------------------------------------
-- Stüdyo oturumları (yapay zekâ ile üretim sohbetleri ve sürümleri)
-- ---------------------------------------------------------------------------
create table if not exists public.studio_sessions (
  id         uuid primary key default gen_random_uuid(),
  title      text not null default 'Yeni çalışma',
  kind       text not null default 'game' check (kind in ('game', 'interaction', 'manipulative', 'test')),
  grade      smallint,
  messages   jsonb not null default '[]'::jsonb,
  versions   jsonb not null default '[]'::jsonb,
  current    integer not null default -1,
  entry_id   uuid references public.cms_entries (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists studio_sessions_time_idx on public.studio_sessions (updated_at desc);

create or replace function public.studio_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists studio_sessions_touch on public.studio_sessions;
create trigger studio_sessions_touch before update on public.studio_sessions
for each row execute function public.studio_touch();

alter table public.studio_sessions enable row level security;
drop policy if exists "admins manage sessions" on public.studio_sessions;
create policy "admins manage sessions" on public.studio_sessions for all using (public.is_cms_admin()) with check (public.is_cms_admin());

-- ---------------------------------------------------------------------------
-- Ayarlar (Stüdyo modeli, ek yönergeler …)
-- ---------------------------------------------------------------------------
create table if not exists public.cms_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.cms_settings enable row level security;
drop policy if exists "admins manage settings" on public.cms_settings;
create policy "admins manage settings" on public.cms_settings for all using (public.is_cms_admin()) with check (public.is_cms_admin());

grant execute on function public.is_cms_admin, public.is_cms_owner, public.claim_first_admin, public.cms_has_admins,
  public.add_cms_admin, public.remove_cms_admin to authenticated;
grant execute on function public.cms_has_admins to anon;

-- Tablo izinleri (yeni projelerde otomatik verilmiyor; erişimi RLS sınırlar)
grant usage on schema public to anon, authenticated;
grant select on public.cms_entries to anon;
grant select, insert, update, delete on public.cms_entries to authenticated;
grant select on public.cms_revisions to authenticated;
grant select, insert, update, delete on public.studio_sessions to authenticated;
grant select, insert, update, delete on public.cms_settings to authenticated;
grant select on public.cms_admins to authenticated;
