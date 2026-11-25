CREATE OR REPLACE FUNCTION public.admin_video_stats()
RETURNS TABLE (
  id uuid, title text, kind text, category text, thumbnail_url text,
  views integer, plays_today bigint, plays_week bigint, viewers bigint,
  likes_count integer, rating_avg numeric, rating_count integer
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  return query
  select v.id, v.title, v.kind, c.name, v.thumbnail_url, v.views,
    (select count(*) from public.video_views vv where vv.video_id = v.id and vv.created_at >= date_trunc('day', now())),
    (select count(*) from public.video_views vv where vv.video_id = v.id and vv.created_at >= now() - interval '7 days'),
    (select count(distinct u.user_id) from (
        select w.user_id from public.watch_progress w where w.video_id = v.id
        union select vv.user_id from public.video_views vv where vv.video_id = v.id and vv.user_id is not null) u),
    v.likes_count, v.rating_avg, v.rating_count
  from public.videos v
  left join public.categories c on c.id = v.category_id
  order by v.views desc, v.created_at desc;
end;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_video_stats() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_video_stats() TO authenticated;