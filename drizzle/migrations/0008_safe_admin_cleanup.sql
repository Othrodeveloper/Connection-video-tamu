CREATE OR REPLACE FUNCTION public.admin_clean_data(_scope text, _confirmation text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _count integer;
BEGIN
  IF NOT public.can_manage(auth.uid(), 'admins') THEN RAISE EXCEPTION 'Huna ruhusa'; END IF;
  IF _confirmation IS DISTINCT FROM 'FUTA' THEN RAISE EXCEPTION 'Andika FUTA kuthibitisha'; END IF;
  CASE _scope
    WHEN 'failed_payments' THEN DELETE FROM public.payments WHERE status = 'failed';
    WHEN 'watch_history' THEN DELETE FROM public.watch_progress WHERE id IS NOT NULL;
    WHEN 'visits' THEN DELETE FROM public.site_visits WHERE id IS NOT NULL;
    ELSE RAISE EXCEPTION 'Chaguo si sahihi';
  END CASE;
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_clean_data(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_clean_data(text,text) TO authenticated;