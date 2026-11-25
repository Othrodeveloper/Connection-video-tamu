ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_source_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_source_check CHECK (source IN ('payment', 'referral', 'admin', 'offer', 'welcome'));
COMMENT ON CONSTRAINT subscriptions_source_check ON public.subscriptions IS 'Includes welcome access created by signup and bulk administrator offers.';