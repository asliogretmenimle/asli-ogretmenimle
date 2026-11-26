-- Yeni Supabase projelerinde tablolar Data API rollerine otomatik açılmıyor.
-- Erişim RLS politikalarıyla sınırlı; burada yalnızca tablo izinleri veriliyor.
grant usage on schema public to anon, authenticated;

grant select on public.cms_entries to anon;
grant select, insert, update, delete on public.cms_entries to authenticated;
grant select on public.cms_revisions to authenticated;
grant select, insert, update, delete on public.studio_sessions to authenticated;
grant select, insert, update, delete on public.cms_settings to authenticated;
grant select on public.cms_admins to authenticated;
