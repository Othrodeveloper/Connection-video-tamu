ALTER TABLE public.payments ADD COLUMN group_id uuid REFERENCES public.groups(id) ON DELETE RESTRICT;
CREATE TABLE public.group_slides (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), image_url text NOT NULL, title text NOT NULL DEFAULT '', sort integer NOT NULL DEFAULT 0);
GRANT SELECT ON public.group_slides TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.group_slides TO authenticated;
GRANT ALL ON public.group_slides TO service_role;
ALTER TABLE public.group_slides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read group slides" ON public.group_slides FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Manage group slides" ON public.group_slides FOR ALL TO authenticated USING (public.can_manage(auth.uid(), 'groups')) WITH CHECK (public.can_manage(auth.uid(), 'groups'));
CREATE OR REPLACE FUNCTION public.finalize_payment(_payment_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _p public.payments; _ref public.referrals; _days integer; _member text;
BEGIN
 SELECT * INTO _p FROM public.payments WHERE id=_payment_id FOR UPDATE;
 IF _p.id IS NULL OR _p.status <> 'pending' THEN RETURN false; END IF;
 IF _p.group_id IS NOT NULL THEN
  PERFORM 1 FROM public.groups WHERE id=_p.group_id FOR UPDATE;
  SELECT status INTO _member FROM public.group_memberships WHERE user_id=_p.user_id AND group_id=_p.group_id;
  INSERT INTO public.group_memberships(user_id,group_id,phone,amount,status,confirmed_at) VALUES(_p.user_id,_p.group_id,_p.phone,_p.amount,'paid',now()) ON CONFLICT(user_id,group_id) DO UPDATE SET status='paid',phone=excluded.phone,amount=excluded.amount,confirmed_at=now();
  IF _member IS NULL OR _member NOT IN ('paid','joined') THEN UPDATE public.groups SET members_count=members_count+1 WHERE id=_p.group_id; END IF;
 ELSE
  PERFORM public._grant_days(_p.user_id,_p.duration_days,_p.package_id,'payment');
  SELECT * INTO _ref FROM public.referrals WHERE referred_id=_p.user_id AND NOT rewarded FOR UPDATE;
  IF _ref.id IS NOT NULL THEN
   SELECT referral_reward_days INTO _days FROM public.site_settings WHERE id=1;
   IF coalesce(_days,0)>0 THEN PERFORM public._grant_days(_ref.referrer_id,_days,null,'referral'); END IF;
   UPDATE public.referrals SET rewarded=true,rewarded_at=now() WHERE id=_ref.id;
  END IF;
 END IF;
 UPDATE public.payments SET status='paid',confirmed_at=now() WHERE id=_p.id;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.finalize_payment(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_payment(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.confirm_payment(_payment_id uuid,_approve boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _p public.payments;
BEGIN
 IF NOT public.can_manage(auth.uid(),'payments') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 SELECT * INTO _p FROM public.payments WHERE id=_payment_id FOR UPDATE;
 IF _p.id IS NULL OR _p.status <> 'pending' THEN RAISE EXCEPTION 'Malipo hayapo au yameshashughulikiwa'; END IF;
 IF _approve THEN PERFORM public.finalize_payment(_payment_id); ELSE UPDATE public.payments SET status='failed',confirmed_at=now() WHERE id=_payment_id; END IF;
END $$;
REVOKE ALL ON FUNCTION public.confirm_payment(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.confirm_payment(uuid,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.purge_deleted_account_details(_uid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.admins WHERE user_id=_uid) OR EXISTS(SELECT 1 FROM public.staff_permissions WHERE user_id=_uid) THEN RAISE EXCEPTION 'Admin protected'; END IF;
 DELETE FROM public.watch_progress WHERE user_id=_uid;
 DELETE FROM public.watchlist WHERE user_id=_uid;
 DELETE FROM public.likes WHERE user_id=_uid;
 DELETE FROM public.ratings WHERE user_id=_uid;
 DELETE FROM public.group_memberships WHERE user_id=_uid;
 DELETE FROM public.subscriptions WHERE user_id=_uid;
 DELETE FROM public.referrals WHERE referrer_id=_uid OR referred_id=_uid;
 UPDATE public.payments SET phone='Imefutwa' WHERE user_id=_uid;
 DELETE FROM public.profiles WHERE id=_uid;
END $$;
REVOKE ALL ON FUNCTION public.purge_deleted_account_details(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.purge_deleted_account_details(uuid) TO service_role;