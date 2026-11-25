ALTER TABLE public.profiles
  ADD COLUMN channel_followed_at timestamptz,
  ADD COLUMN channel_invite_dismissed_at timestamptz;

COMMENT ON COLUMN public.profiles.channel_followed_at IS 'Wakati mtumiaji alipobofya Follow kwenye WhatsApp channel; mwaliko hauonyeshwi tena baada ya hapo.';
COMMENT ON COLUMN public.profiles.channel_invite_dismissed_at IS 'Wakati wa mwisho wa kufunga mwaliko wa WhatsApp channel bila Follow; hutumika kwa ukumbusho wa dakika 10.';