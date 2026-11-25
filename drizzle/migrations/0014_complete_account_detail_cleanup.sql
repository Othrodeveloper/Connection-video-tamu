CREATE OR REPLACE FUNCTION public.purge_deleted_account_details(_uid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_uid AND role='admin') OR EXISTS(SELECT 1 FROM public.staff_permissions WHERE user_id=_uid) THEN RAISE EXCEPTION 'Admin protected'; END IF;
 DELETE FROM public.watch_progress WHERE user_id=_uid;
 DELETE FROM public.watchlist WHERE user_id=_uid;
 DELETE FROM public.likes WHERE user_id=_uid;
 DELETE FROM public.ratings WHERE user_id=_uid;
 DELETE FROM public.group_memberships WHERE user_id=_uid;
 DELETE FROM public.subscriptions WHERE user_id=_uid;
 DELETE FROM public.referrals WHERE referrer_id=_uid OR referred_id=_uid;
 DELETE FROM public.site_visits WHERE user_id=_uid;
 DELETE FROM public.video_views WHERE user_id=_uid;
 UPDATE public.payments SET phone='Imefutwa' WHERE user_id=_uid;
 DELETE FROM public.profiles WHERE id=_uid;
END $$;
REVOKE ALL ON FUNCTION public.purge_deleted_account_details(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.purge_deleted_account_details(uuid) TO service_role;