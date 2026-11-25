CREATE EXTENSION IF NOT EXISTS pg_net;

DROP FUNCTION IF EXISTS public.server_payment_config(text);
DROP FUNCTION IF EXISTS public.server_create_payment(text, uuid, uuid, text);
DROP FUNCTION IF EXISTS public.server_update_payment(text, uuid, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.server_finalize_payment(text, uuid);
DROP FUNCTION IF EXISTS public.server_trial_file(text, uuid, uuid);
DROP FUNCTION IF EXISTS public._server_ok(text);
COMMENT ON TABLE public.server_access_keys IS 'DEPRECATED: payments and trials now run through pay_start, pay_check and trial_file';

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS sonic_request_id bigint;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS sonic_request_kind text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS provider_message text;
ALTER TABLE public.payment_config ADD COLUMN IF NOT EXISTS test_request_id bigint;
ALTER TABLE public.payment_config ADD COLUMN IF NOT EXISTS test_swapped boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public._sonic_auth_bad(_status integer, _json jsonb) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT _status IN (401, 403) OR lower(coalesce(_json->>'message', '') || ' ' || coalesce(_json->>'error', '')) ~ '(invalid.*(api|key|secret)|unauthori[sz]ed|authentication)'
$$;

-- Fire an asynchronous SonicPesa request; the response is read on the next poll.
CREATE OR REPLACE FUNCTION public._sonic_send(_path text, _body jsonb, _swapped boolean)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record;
BEGIN
  SELECT api_key, api_secret, base_url INTO c FROM public.payment_config WHERE id = 1;
  IF coalesce(c.api_key, '') = '' OR coalesce(c.api_secret, '') = '' THEN RETURN NULL; END IF;
  RETURN net.http_post(
    url := rtrim(coalesce(nullif(c.base_url, ''), 'https://api.sonicpesa.com/api/v1'), '/') || _path,
    body := _body,
    headers := jsonb_build_object(
      'Content-Type', 'application/json', 'Accept', 'application/json',
      'X-API-KEY', CASE WHEN _swapped THEN c.api_secret ELSE c.api_key END,
      'X-API-SECRET', CASE WHEN _swapped THEN c.api_key ELSE c.api_secret END),
    timeout_milliseconds := 20000);
END $$;

-- Returns NULL while waiting, else {status, json}; status 0 = network failure.
CREATE OR REPLACE FUNCTION public._sonic_result(_request_id bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; j jsonb;
BEGIN
  IF _request_id IS NULL THEN RETURN NULL; END IF;
  SELECT status_code, content, timed_out, error_msg INTO r FROM net._http_response WHERE id = _request_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF r.status_code IS NULL OR coalesce(r.timed_out, false) THEN RETURN jsonb_build_object('status', 0, 'json', '{}'::jsonb); END IF;
  BEGIN j := r.content::jsonb; EXCEPTION WHEN OTHERS THEN j := '{}'::jsonb; END;
  IF j IS NULL OR jsonb_typeof(j) <> 'object' THEN j := '{}'::jsonb; END IF;
  RETURN jsonb_build_object('status', r.status_code, 'json', j);
END $$;

CREATE OR REPLACE FUNCTION public._swap_payment_keys() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.payment_config SET api_key = api_secret, api_secret = api_key, updated_at = now() WHERE id = 1;
$$;

REVOKE ALL ON FUNCTION public._sonic_auth_bad(integer, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._sonic_send(text, jsonb, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._sonic_result(bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._swap_payment_keys() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.pay_start(_package_id uuid, _group_id uuid, _phone text, _name text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _pname text; _days integer; _price integer; _id uuid; _enabled boolean; _key text; _secret text;
  _req bigint; _email text; _body jsonb;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Ingia kwenye akaunti kwanza.'); END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid AND is_blocked) THEN RETURN jsonb_build_object('ok', false, 'error', 'Akaunti yako imezuiwa. Wasiliana nasi.'); END IF;
  IF coalesce(_phone, '') !~ '^255[67][0-9]{8}$' THEN RETURN jsonb_build_object('ok', false, 'error', 'Namba ya simu si sahihi.'); END IF;
  IF length(trim(coalesce(_name, ''))) < 2 THEN RETURN jsonb_build_object('ok', false, 'error', 'Weka jina la malipo.'); END IF;
  IF (_package_id IS NULL) = (_group_id IS NULL) THEN RETURN jsonb_build_object('ok', false, 'error', 'Chagua kifurushi au group.'); END IF;
  IF _group_id IS NOT NULL THEN
    SELECT g.name, 0, g.price INTO _pname, _days, _price FROM public.groups g WHERE g.id = _group_id AND g.is_active AND g.is_paid AND g.price > 0;
    IF _pname IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Group hili halipatikani kwa malipo.'); END IF;
  ELSE
    SELECT p.name, p.duration_days, p.price INTO _pname, _days, _price FROM public.packages p WHERE p.id = _package_id AND p.is_active;
    IF _pname IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Kifurushi hiki hakipatikani tena. Chagua kingine.'); END IF;
  END IF;

  INSERT INTO public.payments(user_id, package_id, group_id, package_name, duration_days, amount, phone, reference, status)
  VALUES (_uid, _package_id, _group_id, _pname, _days, _price, _phone,
          'TV' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)), 'pending')
  RETURNING id INTO _id;

  SELECT enabled, api_key, api_secret INTO _enabled, _key, _secret FROM public.payment_config WHERE id = 1;
  IF NOT coalesce(_enabled, false) OR coalesce(_key, '') = '' OR coalesce(_secret, '') = '' THEN
    RETURN jsonb_build_object('ok', true, 'paymentId', _id, 'amount', _price, 'packageName', _pname, 'manual', true);
  END IF;

  _email := coalesce(nullif(auth.jwt()->>'email', ''), _phone || '@simu.trandingvideo.app');
  _body := jsonb_build_object('buyer_email', _email, 'buyer_name', trim(_name), 'buyer_phone', _phone, 'amount', _price, 'currency', 'TZS');
  _req := public._sonic_send('/payment/create_order', _body, false);
  UPDATE public.payments SET sonic_request_id = _req, sonic_request_kind = 'create', provider_status = 'SENDING', provider_message = left(trim(_name), 80) WHERE id = _id;
  RETURN jsonb_build_object('ok', true, 'paymentId', _id, 'amount', _price, 'packageName', _pname, 'manual', false);
END $$;
REVOKE ALL ON FUNCTION public.pay_start(uuid, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pay_start(uuid, uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.pay_check(_payment_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); p public.payments; res jsonb; j jsonb; d jsonb; ps text; _st integer; _order text; _email text;
BEGIN
  SELECT * INTO p FROM public.payments WHERE id = _payment_id FOR UPDATE;
  IF p.id IS NULL OR _uid IS NULL OR (p.user_id <> _uid AND NOT public.can_manage(_uid, 'payments')) THEN
    RETURN jsonb_build_object('status', 'missing');
  END IF;
  IF p.status = 'paid' THEN RETURN jsonb_build_object('status', 'paid'); END IF;
  IF p.status = 'failed' THEN RETURN jsonb_build_object('status', 'failed', 'providerStatus', p.provider_status, 'message', p.provider_message); END IF;
  IF p.sonic_request_id IS NULL THEN RETURN jsonb_build_object('status', 'pending', 'providerStatus', p.provider_status); END IF;

  res := public._sonic_result(p.sonic_request_id);

  IF p.sonic_request_kind IN ('create', 'create_swapped') THEN
    IF res IS NULL THEN RETURN jsonb_build_object('status', 'pending', 'providerStatus', 'SENDING'); END IF;
    _st := (res->>'status')::integer;
    j := res->'json';
    d := CASE WHEN jsonb_typeof(j->'data') = 'object' THEN j->'data' ELSE '{}'::jsonb END;
    _order := coalesce(d->>'order_id', d->'order_status_data'->>'order_id', j->>'order_id');
    IF _st BETWEEN 200 AND 299 AND lower(coalesce(j->>'status', '')) = 'success' AND coalesce(_order, '') <> '' THEN
      IF p.sonic_request_kind = 'create_swapped' THEN PERFORM public._swap_payment_keys(); END IF;
      UPDATE public.payments SET order_id = _order, sonic_request_id = NULL, sonic_request_kind = NULL, provider_message = NULL,
        provider_status = upper(coalesce(d->>'payment_status', d->>'status', j->>'payment_status', 'PENDING')) WHERE id = p.id;
      RETURN jsonb_build_object('status', 'pending', 'providerStatus', 'SENT');
    END IF;
    IF p.sonic_request_kind = 'create' AND public._sonic_auth_bad(_st, j) THEN
      -- The two keys may have been saved in each other's fields: retry once the other way round.
      _email := coalesce(nullif(auth.jwt()->>'email', ''), p.phone || '@simu.trandingvideo.app');
      UPDATE public.payments SET sonic_request_kind = 'create_swapped', sonic_request_id = public._sonic_send('/payment/create_order',
        jsonb_build_object('buyer_email', _email, 'buyer_name', coalesce(p.provider_message, 'Mteja'), 'buyer_phone', p.phone, 'amount', p.amount, 'currency', 'TZS'), true)
      WHERE id = p.id;
      RETURN jsonb_build_object('status', 'pending', 'providerStatus', 'SENDING');
    END IF;
    UPDATE public.payments SET status = 'failed', confirmed_at = now(),
      provider_status = CASE WHEN _st = 0 THEN 'NETWORK' WHEN public._sonic_auth_bad(_st, j) THEN 'AUTH' ELSE 'HTTP_' || _st END,
      provider_message = left(coalesce(j->>'message', '') || ' ' || coalesce(j->>'error', ''), 300)
    WHERE id = p.id;
    SELECT * INTO p FROM public.payments WHERE id = p.id;
    RETURN jsonb_build_object('status', 'failed', 'providerStatus', p.provider_status, 'httpStatus', CASE WHEN _st BETWEEN 200 AND 299 THEN 400 ELSE _st END, 'message', p.provider_message);
  END IF;

  -- Status polling: read the last answer, then ask again.
  IF res IS NULL THEN
    RETURN jsonb_build_object('status', 'pending', 'providerStatus', p.provider_status);
  END IF;
  _st := (res->>'status')::integer;
  j := res->'json';
  IF _st BETWEEN 200 AND 299 THEN
    d := CASE WHEN jsonb_typeof(j->'data') = 'object' THEN j->'data' ELSE '{}'::jsonb END;
    ps := upper(coalesce(d->>'payment_status', d->>'status', j->>'payment_status', 'PENDING'));
    IF ps = 'SUCCESS' THEN
      UPDATE public.payments SET provider_status = ps, channel = coalesce(d->>'channel', channel), transid = coalesce(d->>'transid', transid), sonic_request_id = NULL WHERE id = p.id;
      PERFORM public.finalize_payment(p.id);
      SELECT * INTO p FROM public.payments WHERE id = _payment_id;
      RETURN jsonb_build_object('status', CASE WHEN p.status = 'paid' THEN 'paid' ELSE 'pending' END);
    END IF;
    IF ps IN ('CANCELLED', 'USERCANCELLED', 'REJECTED', 'FAILED') THEN
      UPDATE public.payments SET status = 'failed', provider_status = ps, confirmed_at = now(), sonic_request_id = NULL WHERE id = p.id;
      RETURN jsonb_build_object('status', 'failed', 'providerStatus', ps);
    END IF;
    UPDATE public.payments SET provider_status = ps WHERE id = p.id;
  ELSIF _st IN (401, 403) THEN
    UPDATE public.payments SET status = 'failed', provider_status = 'AUTH', confirmed_at = now(), sonic_request_id = NULL WHERE id = p.id;
    RETURN jsonb_build_object('status', 'failed', 'providerStatus', 'AUTH');
  END IF;
  UPDATE public.payments SET sonic_request_id = public._sonic_send('/payment/order_status', jsonb_build_object('order_id', p.order_id), false), sonic_request_kind = 'status' WHERE id = p.id;
  RETURN jsonb_build_object('status', 'pending', 'providerStatus', coalesce(ps, p.provider_status));
END $$;
REVOKE ALL ON FUNCTION public.pay_check(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pay_check(uuid) TO authenticated;

-- After create succeeds, the first status request must be issued by pay_check: seed it here.
CREATE OR REPLACE FUNCTION public._payments_seed_status() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.order_id IS NOT NULL AND OLD.order_id IS NULL AND NEW.status = 'pending' AND NEW.sonic_request_id IS NULL THEN
    NEW.sonic_request_id := public._sonic_send('/payment/order_status', jsonb_build_object('order_id', NEW.order_id), false);
    NEW.sonic_request_kind := 'status';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public._payments_seed_status() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS payments_seed_status ON public.payments;
CREATE TRIGGER payments_seed_status BEFORE UPDATE OF order_id ON public.payments FOR EACH ROW EXECUTE FUNCTION public._payments_seed_status();

CREATE OR REPLACE FUNCTION public.pay_test_connection()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _req bigint;
BEGIN
  IF NOT public.can_manage(auth.uid(), 'admins') THEN RETURN jsonb_build_object('ok', false, 'message', 'Huna ruhusa'); END IF;
  _req := public._sonic_send('/payment/order_status', jsonb_build_object('order_id', 'sp_test_connection'), false);
  IF _req IS NULL THEN RETURN jsonb_build_object('ok', false, 'message', 'Weka API key na API secret zote mbili kisha uhifadhi.'); END IF;
  UPDATE public.payment_config SET test_request_id = _req, test_swapped = false WHERE id = 1;
  RETURN jsonb_build_object('ok', true, 'waiting', true);
END $$;
REVOKE ALL ON FUNCTION public.pay_test_connection() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pay_test_connection() TO authenticated;

CREATE OR REPLACE FUNCTION public.pay_test_result()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; res jsonb; _st integer; j jsonb;
BEGIN
  IF NOT public.can_manage(auth.uid(), 'admins') THEN RETURN jsonb_build_object('done', true, 'ok', false, 'message', 'Huna ruhusa'); END IF;
  SELECT test_request_id, test_swapped INTO c FROM public.payment_config WHERE id = 1;
  res := public._sonic_result(c.test_request_id);
  IF res IS NULL THEN RETURN jsonb_build_object('done', false); END IF;
  _st := (res->>'status')::integer; j := res->'json';
  IF _st = 0 THEN RETURN jsonb_build_object('done', true, 'ok', false, 'message', 'Hatukuweza kufikia SonicPesa. Jaribu tena.'); END IF;
  IF public._sonic_auth_bad(_st, j) THEN
    IF NOT c.test_swapped THEN
      UPDATE public.payment_config SET test_swapped = true,
        test_request_id = public._sonic_send('/payment/order_status', jsonb_build_object('order_id', 'sp_test_connection'), true) WHERE id = 1;
      RETURN jsonb_build_object('done', false);
    END IF;
    RETURN jsonb_build_object('done', true, 'ok', false, 'message', 'SonicPesa imekataa API key na API secret. Hakikisha ni funguo za akaunti iliyoidhinishwa.');
  END IF;
  IF _st >= 500 THEN RETURN jsonb_build_object('done', true, 'ok', false, 'message', 'SonicPesa ina hitilafu kwa sasa. Jaribu baadaye.'); END IF;
  IF c.test_swapped THEN
    PERFORM public._swap_payment_keys();
    UPDATE public.payment_config SET test_swapped = false WHERE id = 1;
    RETURN jsonb_build_object('done', true, 'ok', true, 'message', 'Funguo zilikuwa zimewekwa kinyume; tumezipanga sawa. SonicPesa imezikubali.');
  END IF;
  RETURN jsonb_build_object('done', true, 'ok', true, 'message', 'SonicPesa imekubali funguo. Malipo yako tayari.');
END $$;
REVOKE ALL ON FUNCTION public.pay_test_result() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pay_test_result() TO authenticated;

CREATE OR REPLACE FUNCTION public.save_payment_config(_api_key text, _api_secret text, _enabled boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _k text := nullif(trim(coalesce(_api_key, '')), ''); _s text := nullif(trim(coalesce(_api_secret, '')), '');
BEGIN
  IF NOT public.can_manage(auth.uid(), 'admins') THEN RAISE EXCEPTION 'Huna ruhusa'; END IF;
  IF length(coalesce(_k, '')) > 2048 OR length(coalesce(_s, '')) > 2048 THEN RAISE EXCEPTION 'Funguo ni ndefu mno'; END IF;
  UPDATE public.payment_config SET
    enabled = coalesce(_enabled, enabled),
    base_url = 'https://api.sonicpesa.com/api/v1',
    api_key = coalesce(_k, api_key),
    api_secret = coalesce(_s, api_secret),
    updated_at = now()
  WHERE id = 1;
  IF EXISTS (SELECT 1 FROM public.payment_config WHERE id = 1 AND (coalesce(api_key, '') = '' OR coalesce(api_secret, '') = '')) THEN
    RAISE EXCEPTION 'Weka API key na API secret zote mbili';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.save_payment_config(text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_payment_config(text, text, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.trial_file(_video_id uuid, _episode_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _url text;
BEGIN
  IF _uid IS NULL THEN RETURN NULL; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid AND is_blocked) THEN RETURN NULL; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.videos WHERE id = _video_id AND is_published AND publish_at <= now()) THEN RETURN NULL; END IF;
  IF _episode_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.episodes WHERE id = _episode_id AND video_id = _video_id) THEN RETURN NULL; END IF;
  SELECT f.url INTO _url FROM public.video_files f
   WHERE f.video_id = _video_id AND f.episode_id IS NOT DISTINCT FROM _episode_id
   ORDER BY f.created_at LIMIT 1;
  IF _url IS NULL THEN RETURN NULL; END IF;
  IF _url LIKE 'storage:videos/%' THEN
    DELETE FROM public.trial_passes WHERE expires_at < now() - interval '1 day';
    INSERT INTO public.trial_passes(user_id, object_path, expires_at)
    VALUES (_uid, substr(_url, length('storage:videos/') + 1), now() + interval '2 minutes');
  END IF;
  RETURN _url;
END $$;
REVOKE ALL ON FUNCTION public.trial_file(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trial_file(uuid, uuid) TO authenticated;