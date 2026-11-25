CREATE TABLE public.site_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text NOT NULL,
  user_id uuid,
  path text NOT NULL DEFAULT '/',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX site_visits_created_idx ON public.site_visits (created_at);
CREATE INDEX site_visits_visitor_idx ON public.site_visits (visitor_id);
GRANT INSERT ON public.site_visits TO anon, authenticated;
GRANT SELECT, DELETE ON public.site_visits TO authenticated;
GRANT ALL ON public.site_visits TO service_role;
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone logs a visit" ON public.site_visits FOR INSERT TO anon, authenticated
  WITH CHECK ((user_id IS NULL OR user_id = auth.uid()) AND length(visitor_id) BETWEEN 8 AND 64 AND length(path) <= 300);
CREATE POLICY "Admins read visits" ON public.site_visits FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete visits" ON public.site_visits FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.video_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX video_views_video_idx ON public.video_views (video_id, created_at);
GRANT SELECT ON public.video_views TO authenticated;
GRANT ALL ON public.video_views TO service_role;
ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read video views" ON public.video_views FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.record_view(_video_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  update public.videos set views = views + 1 where id = _video_id;
  insert into public.video_views (video_id, user_id) values (_video_id, auth.uid());
end;
$$;

CREATE OR REPLACE FUNCTION public.admin_analytics(_days integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
declare
  _since timestamptz := date_trunc('day', now()) - make_interval(days => greatest(coalesce(_days, 30), 1) - 1);
  _r jsonb;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  select jsonb_build_object(
    'visits', (select count(*) from public.site_visits where created_at >= _since),
    'visitors', (select count(distinct visitor_id) from public.site_visits where created_at >= _since),
    'signed_in_visitors', (select count(distinct user_id) from public.site_visits where created_at >= _since and user_id is not null),
    'today_visitors', (select count(distinct visitor_id) from public.site_visits where created_at >= date_trunc('day', now())),
    'online_now', (select count(distinct visitor_id) from public.site_visits where created_at >= now() - interval '5 minutes'),
    'total_users', (select count(*) from public.profiles),
    'new_users', (select count(*) from public.profiles where created_at >= _since),
    'subscribed_users', (select count(distinct user_id) from public.subscriptions where expires_at > now()),
    'period_views', (select count(*) from public.video_views where created_at >= _since),
    'all_views', (select coalesce(sum(views), 0) from public.videos),
    'viewers', (select count(distinct user_id) from (
        select user_id from public.watch_progress
        union select user_id from public.video_views where user_id is not null) x),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', to_char(d.day, 'YYYY-MM-DD'),
        'visits', (select count(*) from public.site_visits s where s.created_at >= d.day and s.created_at < d.day + interval '1 day'),
        'visitors', (select count(distinct s.visitor_id) from public.site_visits s where s.created_at >= d.day and s.created_at < d.day + interval '1 day'),
        'views', (select count(*) from public.video_views v where v.created_at >= d.day and v.created_at < d.day + interval '1 day')
      ) order by d.day), '[]'::jsonb)
      from generate_series(_since, date_trunc('day', now()), interval '1 day') as d(day)
    ),
    'pages', (
      select coalesce(jsonb_agg(jsonb_build_object('path', p.path, 'visits', p.n) order by p.n desc), '[]'::jsonb)
      from (select path, count(*) n from public.site_visits where created_at >= _since group by path order by n desc limit 8) p
    ),
    'videos', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', t.id, 'title', t.title, 'thumbnail_url', t.thumbnail_url, 'views', t.views,
        'period_views', t.period_views, 'viewers', t.viewers) order by t.views desc, t.period_views desc), '[]'::jsonb)
      from (
        select v.id, v.title, v.thumbnail_url, v.views,
          (select count(*) from public.video_views vv where vv.video_id = v.id and vv.created_at >= _since) as period_views,
          (select count(distinct u.user_id) from (
              select user_id from public.watch_progress w where w.video_id = v.id
              union select user_id from public.video_views vv where vv.video_id = v.id and vv.user_id is not null) u) as viewers
        from public.videos v
        order by v.views desc
        limit 12
      ) t
    )
  ) into _r;
  return _r;
end;
$$;

CREATE OR REPLACE FUNCTION public.admin_revoke_offer(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  delete from public.subscriptions where user_id = _user_id and source in ('admin', 'offer') and expires_at > now();
end;
$$;

CREATE OR REPLACE FUNCTION public.admin_revoke_offers_all()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare _n int;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  with d as (delete from public.subscriptions where source = 'offer' and expires_at > now() returning user_id)
  select count(distinct user_id) into _n from d;
  return _n;
end;
$$;

CREATE OR REPLACE FUNCTION public.admin_reopen_payment(_payment_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare _p public.payments; _sid uuid;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  select * into _p from public.payments where id = _payment_id for update;
  if _p.id is null then raise exception 'Malipo hayapo'; end if;
  if _p.status = 'paid' then
    select id into _sid from public.subscriptions
      where user_id = _p.user_id and source = 'payment'
        and package_id is not distinct from _p.package_id
      order by abs(extract(epoch from (created_at - coalesce(_p.confirmed_at, now())))) limit 1;
    if _sid is not null then delete from public.subscriptions where id = _sid; end if;
  end if;
  update public.payments set status = 'pending', confirmed_at = null where id = _p.id;
end;
$$;

CREATE OR REPLACE FUNCTION public.create_payment(_package_id uuid, _phone text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare
  _pkg public.packages;
  _id uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if exists (select 1 from public.profiles where id = auth.uid() and is_blocked) then raise exception 'Akaunti yako imezuiwa. Wasiliana nasi.'; end if;
  if _phone !~ '^255[67][0-9]{8}$' then raise exception 'Namba ya simu si sahihi'; end if;
  select * into _pkg from public.packages where id = _package_id and is_active;
  if _pkg.id is null then raise exception 'Kifurushi hakipatikani'; end if;
  insert into public.payments (user_id, package_id, package_name, duration_days, amount, phone, reference)
  values (auth.uid(), _pkg.id, _pkg.name, _pkg.duration_days, _pkg.price, _phone,
          'TV' || upper(substr(md5(random()::text), 1, 8)))
  returning id into _id;
  return _id;
end;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_analytics(integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_revoke_offer(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_revoke_offers_all() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_reopen_payment(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_analytics(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_offer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_offers_all() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reopen_payment(uuid) TO authenticated;