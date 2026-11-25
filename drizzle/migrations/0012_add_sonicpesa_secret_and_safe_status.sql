ALTER TABLE public.payment_config ADD COLUMN IF NOT EXISTS api_secret text NOT NULL DEFAULT '';

REVOKE SELECT ON public.payment_config FROM authenticated;
GRANT SELECT (id, provider, base_url, enabled, updated_at) ON public.payment_config TO authenticated;
GRANT ALL ON public.payment_config TO service_role;

CREATE OR REPLACE FUNCTION public.payment_config_status()
RETURNS TABLE (enabled boolean, key_configured boolean, secret_configured boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_manage(auth.uid(), 'admins') THEN
    RAISE EXCEPTION 'Huna ruhusa';
  END IF;
  RETURN QUERY
  SELECT c.enabled, c.api_key <> '', c.api_secret <> ''
  FROM public.payment_config c
  WHERE c.id = 1;
END;
$$;
REVOKE ALL ON FUNCTION public.payment_config_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.payment_config_status() TO authenticated;