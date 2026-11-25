CREATE TABLE public.server_access_keys (id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1), key_hash text NOT NULL);
GRANT ALL ON public.server_access_keys TO service_role;
ALTER TABLE public.server_access_keys ENABLE ROW LEVEL SECURITY;
INSERT INTO public.server_access_keys(id, key_hash) VALUES (1, '8618871edcc1fbbb1bdd37b5811968a9bd34807f6bf36eca491cc7e743852965');

CREATE TABLE public.trial_passes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  object_path text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX trial_passes_lookup ON public.trial_passes(user_id, object_path, expires_at);
GRANT ALL ON public.trial_passes TO service_role;
ALTER TABLE public.trial_passes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public._server_ok(_token text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.server_access_keys WHERE id = 1 AND key_hash = encode(sha256(convert_to(coalesce(_token, ''), 'UTF8')), 'hex'))
$$;
REVOKE ALL ON FUNCTION public._server_ok(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.has_trial_pass(_uid uuid, _path text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _uid IS NOT NULL AND EXISTS (SELECT 1 FROM public.trial_passes WHERE user_id = _uid AND object_path = _path AND expires_at > now())
$$;
GRANT EXECUTE ON FUNCTION public.has_trial_pass(uuid, text) TO authenticated;

DROP POLICY IF EXISTS "Trial viewers read video files" ON storage.objects;
CREATE POLICY "Trial viewers read video files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'videos' AND public.has_trial_pass(auth.uid(), name));

CREATE OR REPLACE FUNCTION public.server_payment_config(_token text)
RETURNS TABLE(api_key text, api_secret text, base_url text, enabled boolean) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public._server_ok(_token) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY SELECT c.api_key, c.api_secret, c.base_url, c.enabled FROM public.payment_config c WHERE c.id = 1;
END $$;

CREATE OR REPLACE FUNCTION public.server_create_payment(_token text, _package_id uuid, _group_id uuid, _phone text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _id uuid; _name text; _days integer; _price numeric;
BEGIN
  IF NOT public._server_ok(_token) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF _phone !~ '^255[67][0-9]{8}$' THEN RAISE EXCEPTION 'Invalid phone'; END IF;
  IF _group_id IS NOT NULL THEN
    SELECT g.name, 0, g.price INTO _name, _days, _price FROM public.groups g WHERE g.id = _group_id AND g.is_active AND g.is_paid AND g.price > 0;
  ELSE
    SELECT p.name, p.duration_days, p.price INTO _name, _days, _price FROM public.packages p WHERE p.id = _package_id AND p.is_active;
  END IF;
  IF _name IS NULL THEN RAISE EXCEPTION 'Package unavailable'; END IF;
  INSERT INTO public.payments(user_id, package_id, group_id, package_name, duration_days, amount, phone, reference, status)
  VALUES (_uid, CASE WHEN _group_id IS NULL THEN _package_id END, _group_id, _name, _days, _price, _phone,
          'TV' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)), 'pending')
  RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.server_update_payment(_token text, _payment_id uuid, _status text, _provider_status text, _order_id text, _channel text, _transid text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public._server_ok(_token) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _status IS NOT NULL AND _status NOT IN ('failed', 'pending') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  UPDATE public.payments SET
    status = CASE WHEN _status IS NOT NULL AND status = 'pending' THEN _status ELSE status END,
    confirmed_at = CASE WHEN _status = 'failed' AND status = 'pending' THEN now() ELSE confirmed_at END,
    provider_status = coalesce(_provider_status, provider_status),
    order_id = coalesce(_order_id, order_id),
    channel = coalesce(_channel, channel),
    transid = coalesce(_transid, transid)
  WHERE id = _payment_id;
END $$;

CREATE OR REPLACE FUNCTION public.server_finalize_payment(_token text, _payment_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public._server_ok(_token) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN public.finalize_payment(_payment_id);
END $$;

CREATE OR REPLACE FUNCTION public.server_trial_file(_token text, _video_id uuid, _episode_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _url text;
BEGIN
  IF NOT public._server_ok(_token) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _uid IS NULL THEN RETURN NULL; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid AND is_blocked) THEN RETURN NULL; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.videos WHERE id = _video_id AND is_published AND publish_at <= now()) THEN RETURN NULL; END IF;
  SELECT f.url INTO _url FROM public.video_files f
   WHERE f.video_id = _video_id AND f.episode_id IS NOT DISTINCT FROM _episode_id
   ORDER BY f.created_at LIMIT 1;
  IF _url IS NULL THEN RETURN NULL; END IF;
  IF _url LIKE 'storage:videos/%' THEN
    DELETE FROM public.trial_passes WHERE expires_at < now() - interval '1 day';
    INSERT INTO public.trial_passes(user_id, object_path, expires_at) VALUES (_uid, substr(_url, length('storage:videos/') + 1), now() + interval '2 minutes');
  END IF;
  RETURN _url;
END $$;

REVOKE ALL ON FUNCTION public.server_payment_config(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.server_create_payment(text, uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.server_update_payment(text, uuid, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.server_finalize_payment(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.server_trial_file(text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.server_payment_config(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.server_create_payment(text, uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.server_update_payment(text, uuid, text, text, text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.server_finalize_payment(text, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.server_trial_file(text, uuid, uuid) TO authenticated, service_role;