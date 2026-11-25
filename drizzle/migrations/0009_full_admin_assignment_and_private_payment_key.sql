CREATE OR REPLACE FUNCTION public.admin_set_full_staff(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_manage(auth.uid(), 'admins') THEN RAISE EXCEPTION 'Huna ruhusa'; END IF;
  IF _user_id = auth.uid() THEN RAISE EXCEPTION 'Huwezi kubadilisha ruhusa zako mwenyewe'; END IF;
  PERFORM public.admin_set_staff(_user_id, NULL);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_full_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_full_staff(uuid) TO authenticated;
REVOKE SELECT ON public.payment_config FROM authenticated;
GRANT SELECT (id, provider, base_url, enabled, updated_at) ON public.payment_config TO authenticated;