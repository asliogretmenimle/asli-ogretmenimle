-- Yeni Supabase projelerinde tablolar service_role'e de otomatik açılmıyor.
-- Stüdyo fonksiyonu (OpenAI anahtarı, yönetici hesabı oluşturma) bu rolle çalışır.
grant usage on schema public to service_role;
grant all on public.cms_secrets, public.cms_admins, public.cms_entries, public.cms_revisions,
  public.cms_settings, public.studio_sessions, public.lesson_requests, public.page_views to service_role;
grant usage, select on all sequences in schema public to service_role;
