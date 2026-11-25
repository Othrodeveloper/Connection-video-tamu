insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role from auth.users where email = '255713822753@simu.trandingvideo.app'
on conflict do nothing;

alter table public.site_settings
  add column if not exists support_instagram text,
  add column if not exists support_facebook text,
  add column if not exists support_tiktok text,
  add column if not exists support_telegram text,
  add column if not exists support_hours text,
  add column if not exists support_message text,
  add column if not exists payment_instructions text,
  add column if not exists texts jsonb not null default '{}'::jsonb;

update public.site_settings set logo_url = '/images/logo.png' where id = 1 and logo_url is null;
