-- ===== Admin sections =====
CREATE TABLE public.staff_permissions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sections text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.staff_permissions TO authenticated;
GRANT ALL ON public.staff_permissions TO service_role;
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;

-- An admin without a staff_permissions row is a full admin; with a row, only the listed sections.
CREATE OR REPLACE FUNCTION public.can_manage(_uid uuid, _section text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select public.has_role(_uid, 'admin') and (
    not exists (select 1 from public.staff_permissions where user_id = _uid)
    or (_section <> 'admins' and exists (
      select 1 from public.staff_permissions where user_id = _uid and _section = any(sections)))
  )
$$;

CREATE POLICY "Own or full admin reads staff" ON public.staff_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_manage(auth.uid(), 'admins'));

CREATE OR REPLACE FUNCTION public.my_admin_sections()
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select case
    when not public.has_role(auth.uid(), 'admin') then '{}'::text[]
    when not exists (select 1 from public.staff_permissions where user_id = auth.uid()) then null
    else (select sections from public.staff_permissions where user_id = auth.uid())
  end
$$;

CREATE OR REPLACE FUNCTION public.admin_set_staff(_user_id uuid, _sections text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if not public.can_manage(auth.uid(), 'admins') then raise exception 'Forbidden'; end if;
  if _user_id = auth.uid() then raise exception 'Huwezi kubadilisha ruhusa zako mwenyewe'; end if;
  insert into public.user_roles (user_id, role) values (_user_id, 'admin') on conflict do nothing;
  if _sections is null then
    delete from public.staff_permissions where user_id = _user_id;
  else
    insert into public.staff_permissions (user_id, sections)
    values (_user_id, array(select distinct s from unnest(_sections) s where s <> 'admins'))
    on conflict (user_id) do update set sections = excluded.sections;
  end if;
end;
$$;

CREATE OR REPLACE FUNCTION public.admin_remove_staff(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if not public.can_manage(auth.uid(), 'admins') then raise exception 'Forbidden'; end if;
  if _user_id = auth.uid() then raise exception 'Huwezi kujiondoa mwenyewe'; end if;
  delete from public.user_roles where user_id = _user_id and role = 'admin';
  delete from public.staff_permissions where user_id = _user_id;
end;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_staff()
RETURNS TABLE (user_id uuid, full_name text, phone text, sections text[], is_full boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
begin
  if not public.can_manage(auth.uid(), 'admins') then raise exception 'Forbidden'; end if;
  return query
  select r.user_id, coalesce(p.full_name, ''), p.phone, s.sections, s.user_id is null
  from public.user_roles r
  left join public.profiles p on p.id = r.user_id
  left join public.staff_permissions s on s.user_id = r.user_id
  where r.role = 'admin'
  order by (s.user_id is null) desc, p.full_name;
end;
$$;

-- Rewrite admin table policies to section checks.
DO $$
declare
  r record;
  m jsonb := jsonb_build_object(
    'categories', 'public.can_manage(auth.uid(), ''videos'')',
    'videos', 'public.can_manage(auth.uid(), ''videos'')',
    'seasons', 'public.can_manage(auth.uid(), ''videos'')',
    'episodes', 'public.can_manage(auth.uid(), ''videos'')',
    'video_files', 'public.can_manage(auth.uid(), ''videos'')',
    'groups', 'public.can_manage(auth.uid(), ''groups'')',
    'group_links', 'public.can_manage(auth.uid(), ''groups'')',
    'group_memberships', '(public.can_manage(auth.uid(), ''groups'') OR public.can_manage(auth.uid(), ''payments''))',
    'packages', 'public.can_manage(auth.uid(), ''packages'')',
    'payments', '(public.can_manage(auth.uid(), ''payments'') OR public.can_manage(auth.uid(), ''users''))',
    'subscriptions', '(public.can_manage(auth.uid(), ''users'') OR public.can_manage(auth.uid(), ''payments''))',
    'notifications', 'public.can_manage(auth.uid(), ''notifications'')',
    'profiles', '(public.can_manage(auth.uid(), ''users'') OR public.can_manage(auth.uid(), ''payments''))',
    'referrals', 'public.can_manage(auth.uid(), ''users'')',
    'user_roles', 'public.can_manage(auth.uid(), ''admins'')',
    'site_settings', 'public.can_manage(auth.uid(), ''settings'')',
    'site_visits', 'public.can_manage(auth.uid(), ''dashboard'')',
    'video_views', 'public.can_manage(auth.uid(), ''dashboard'')',
    'watch_progress', 'public.can_manage(auth.uid(), ''users'')'
  );
  needle text := 'has_role(auth.uid(), ''admin''::app_role)';
  expr text; q text; w text; sql text;
begin
  for r in
    select * from pg_policies
    where schemaname = 'public'
      and (coalesce(qual, '') like '%' || needle || '%' or coalesce(with_check, '') like '%' || needle || '%')
  loop
    expr := m ->> r.tablename;
    if expr is null then continue; end if;
    q := replace(r.qual, needle, expr);
    w := replace(r.with_check, needle, expr);
    execute format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
    sql := format('CREATE POLICY %I ON public.%I AS %s FOR %s TO %s', r.policyname, r.tablename, r.permissive, r.cmd,
                  array_to_string(r.roles::text[], ', '));
    if q is not null then sql := sql || ' USING (' || q || ')'; end if;
    if w is not null then sql := sql || ' WITH CHECK (' || w || ')'; end if;
    execute sql;
  end loop;
end $$;

-- Rewrite admin checks inside functions to section checks.
DO $$
declare
  f record; d text; sec text;
begin
  for f in
    select p.oid, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'admin_end_access','admin_grant_days','admin_grant_days_all','admin_revoke_offer','admin_revoke_offers_all',
      'protect_profile_flags','confirm_payment','confirm_group_payment','admin_reopen_payment',
      'admin_analytics','admin_video_stats')
  loop
    sec := case
      when f.proname in ('confirm_payment','confirm_group_payment','admin_reopen_payment') then 'payments'
      when f.proname in ('admin_analytics','admin_video_stats') then 'dashboard'
      else 'users' end;
    d := pg_get_functiondef(f.oid);
    d := replace(d, 'public.has_role(auth.uid(), ''admin'')', format('public.can_manage(auth.uid(), %L)', sec));
    execute d;
  end loop;
end $$;

-- ===== Payment gateway =====
CREATE TABLE public.payment_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  provider text NOT NULL DEFAULT 'sonicpesa',
  api_key text NOT NULL DEFAULT '',
  base_url text NOT NULL DEFAULT 'https://api.sonicpesa.com/api/v1',
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.payment_config (id) VALUES (1) ON CONFLICT DO NOTHING;
GRANT SELECT, UPDATE ON public.payment_config TO authenticated;
GRANT ALL ON public.payment_config TO service_role;
ALTER TABLE public.payment_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Full admins read payment config" ON public.payment_config FOR SELECT TO authenticated
  USING (public.can_manage(auth.uid(), 'admins'));
CREATE POLICY "Full admins update payment config" ON public.payment_config FOR UPDATE TO authenticated
  USING (public.can_manage(auth.uid(), 'admins')) WITH CHECK (public.can_manage(auth.uid(), 'admins'));

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS order_id text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS provider_status text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS channel text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS transid text;
CREATE INDEX IF NOT EXISTS payments_order_id_idx ON public.payments (order_id);

-- Marks a pending payment paid and opens the user's days (used by the gateway check on the server).
CREATE OR REPLACE FUNCTION public.finalize_payment(_payment_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare
  _p public.payments;
  _ref public.referrals;
  _days int;
begin
  select * into _p from public.payments where id = _payment_id for update;
  if _p.id is null or _p.status <> 'pending' then return false; end if;
  update public.payments set status = 'paid', confirmed_at = now() where id = _p.id;
  perform public._grant_days(_p.user_id, _p.duration_days, _p.package_id, 'payment');
  select * into _ref from public.referrals where referred_id = _p.user_id and not rewarded for update;
  if _ref.id is not null then
    select referral_reward_days into _days from public.site_settings where id = 1;
    if coalesce(_days, 0) > 0 then
      perform public._grant_days(_ref.referrer_id, _days, null, 'referral');
    end if;
    update public.referrals set rewarded = true, rewarded_at = now() where id = _ref.id;
  end if;
  return true;
end;
$$;
REVOKE EXECUTE ON FUNCTION public.finalize_payment(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_payment(uuid) TO service_role;

-- ===== Trial and welcome minutes =====
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS trial_seconds integer NOT NULL DEFAULT 20;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS welcome_minutes integer NOT NULL DEFAULT 30;

CREATE OR REPLACE FUNCTION public.grant_welcome_minutes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare _m int;
begin
  select welcome_minutes into _m from public.site_settings where id = 1;
  if coalesce(_m, 0) > 0 and not exists (select 1 from public.subscriptions where user_id = new.id and source = 'welcome') then
    insert into public.subscriptions (user_id, starts_at, expires_at, source)
    values (new.id, now(), now() + make_interval(mins => _m), 'welcome');
  end if;
  return new;
end;
$$;
DROP TRIGGER IF EXISTS profiles_welcome_minutes ON public.profiles;
CREATE TRIGGER profiles_welcome_minutes AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.grant_welcome_minutes();

REVOKE EXECUTE ON FUNCTION public.admin_set_staff(uuid, text[]) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_remove_staff(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_list_staff() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_set_staff(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_admin_sections() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage(uuid, text) TO authenticated;