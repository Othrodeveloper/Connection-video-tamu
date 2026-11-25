
-- ROLES
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users see own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Admins manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- SITE SETTINGS
create table public.site_settings (
  id int primary key default 1 check (id = 1),
  site_name text not null default 'TRANDING VIDEO',
  logo_url text,
  intro_video_url text,
  support_phone text,
  support_whatsapp text,
  support_email text,
  paywall_delay_seconds int not null default 15,
  referral_reward_days int not null default 3,
  updated_at timestamptz not null default now()
);
grant select on public.site_settings to anon, authenticated;
grant update on public.site_settings to authenticated;
grant all on public.site_settings to service_role;
alter table public.site_settings enable row level security;
create policy "Anyone reads settings" on public.site_settings for select to anon, authenticated using (true);
create policy "Admins update settings" on public.site_settings for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text unique,
  avatar_url text,
  referral_code text unique,
  notify_new_videos boolean not null default true,
  notify_new_episodes boolean not null default true,
  notify_expiry boolean not null default true,
  notifications_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Own profile or admin read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Own profile update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- REFERRALS
create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null,
  referred_id uuid not null unique,
  rewarded boolean not null default false,
  rewarded_at timestamptz,
  created_at timestamptz not null default now()
);
grant select on public.referrals to authenticated;
grant all on public.referrals to service_role;
alter table public.referrals enable row level security;
create policy "See own referrals" on public.referrals for select to authenticated
  using (referrer_id = auth.uid() or referred_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- CATEGORIES
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "Anyone reads categories" on public.categories for select to anon, authenticated using (true);
create policy "Admins manage categories" on public.categories for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- VIDEOS
create table public.videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  year int,
  category_id uuid references public.categories(id) on delete set null,
  kind text not null default 'movie' check (kind in ('movie','series')),
  thumbnail_url text,
  banner_url text,
  trailer_url text,
  duration_minutes int,
  is_featured boolean not null default false,
  is_coming_soon boolean not null default false,
  is_published boolean not null default true,
  publish_at timestamptz not null default now(),
  views int not null default 0,
  likes_count int not null default 0,
  rating_avg numeric(3,2) not null default 0,
  rating_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.videos to anon, authenticated;
grant insert, update, delete on public.videos to authenticated;
grant all on public.videos to service_role;
alter table public.videos enable row level security;
create policy "Public reads published videos" on public.videos for select to anon, authenticated
  using ((is_published and (publish_at <= now() or is_coming_soon)) or public.has_role(auth.uid(), 'admin'));
create policy "Admins manage videos" on public.videos for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- SEASONS / EPISODES
create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  number int not null,
  title text,
  unique (video_id, number)
);
grant select on public.seasons to anon, authenticated;
grant insert, update, delete on public.seasons to authenticated;
grant all on public.seasons to service_role;
alter table public.seasons enable row level security;
create policy "Anyone reads seasons" on public.seasons for select to anon, authenticated using (true);
create policy "Admins manage seasons" on public.seasons for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create table public.episodes (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  number int not null,
  title text not null,
  description text not null default '',
  duration_minutes int,
  thumbnail_url text,
  created_at timestamptz not null default now(),
  unique (season_id, number)
);
grant select on public.episodes to anon, authenticated;
grant insert, update, delete on public.episodes to authenticated;
grant all on public.episodes to service_role;
alter table public.episodes enable row level security;
create policy "Anyone reads episodes" on public.episodes for select to anon, authenticated using (true);
create policy "Admins manage episodes" on public.episodes for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- PACKAGES
create table public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  duration_days int not null check (duration_days > 0),
  price int not null check (price >= 0),
  description text not null default '',
  is_active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.packages to anon, authenticated;
grant insert, update, delete on public.packages to authenticated;
grant all on public.packages to service_role;
alter table public.packages enable row level security;
create policy "Anyone reads active packages" on public.packages for select to anon, authenticated
  using (is_active or public.has_role(auth.uid(), 'admin'));
create policy "Admins manage packages" on public.packages for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- SUBSCRIPTIONS
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  package_id uuid references public.packages(id) on delete set null,
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  source text not null default 'payment' check (source in ('payment','referral','admin')),
  created_at timestamptz not null default now()
);
create index on public.subscriptions (user_id, expires_at desc);
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
alter table public.subscriptions enable row level security;
create policy "Own subscriptions" on public.subscriptions for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create or replace function public.has_active_subscription(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.subscriptions where user_id = _user_id and expires_at > now())
      or public.has_role(_user_id, 'admin')
$$;

-- VIDEO FILES (protected sources)
create table public.video_files (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  episode_id uuid references public.episodes(id) on delete cascade,
  url text not null,
  quality text not null default 'Auto',
  subtitle_url text,
  subtitle_label text default 'Kiswahili',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.video_files to authenticated;
grant all on public.video_files to service_role;
alter table public.video_files enable row level security;
create policy "Subscribers read files" on public.video_files for select to authenticated
  using (public.has_active_subscription(auth.uid()));
create policy "Admins manage files" on public.video_files for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- PAYMENTS
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  package_id uuid references public.packages(id) on delete set null,
  package_name text not null,
  duration_days int not null,
  amount int not null,
  phone text not null,
  status text not null default 'pending' check (status in ('pending','paid','failed')),
  reference text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);
grant select on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "Own payments" on public.payments for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- WATCHLIST / LIKES / RATINGS / PROGRESS
create table public.watchlist (
  user_id uuid not null,
  video_id uuid not null references public.videos(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, video_id)
);
grant select, insert, delete on public.watchlist to authenticated;
grant all on public.watchlist to service_role;
alter table public.watchlist enable row level security;
create policy "Own watchlist" on public.watchlist for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.likes (
  user_id uuid not null,
  video_id uuid not null references public.videos(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, video_id)
);
grant select, insert, delete on public.likes to authenticated;
grant all on public.likes to service_role;
alter table public.likes enable row level security;
create policy "Own likes" on public.likes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.ratings (
  user_id uuid not null,
  video_id uuid not null references public.videos(id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (user_id, video_id)
);
grant select, insert, update, delete on public.ratings to authenticated;
grant all on public.ratings to service_role;
alter table public.ratings enable row level security;
create policy "Own ratings" on public.ratings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.watch_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  video_id uuid not null references public.videos(id) on delete cascade,
  episode_id uuid references public.episodes(id) on delete cascade,
  position_seconds int not null default 0,
  duration_seconds int not null default 0,
  updated_at timestamptz not null default now()
);
create unique index watch_progress_unique on public.watch_progress (user_id, video_id, coalesce(episode_id, '00000000-0000-0000-0000-000000000000'::uuid));
grant select, insert, update, delete on public.watch_progress to authenticated;
grant all on public.watch_progress to service_role;
alter table public.watch_progress enable row level security;
create policy "Own progress" on public.watch_progress for all to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin')) with check (user_id = auth.uid());

-- GROUPS
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  category text not null default 'Nyinginezo',
  image_url text,
  members_count int not null default 0,
  is_paid boolean not null default false,
  price int not null default 0,
  is_active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.groups to anon, authenticated;
grant insert, update, delete on public.groups to authenticated;
grant all on public.groups to service_role;
alter table public.groups enable row level security;
create policy "Anyone reads active groups" on public.groups for select to anon, authenticated
  using (is_active or public.has_role(auth.uid(), 'admin'));
create policy "Admins manage groups" on public.groups for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create table public.group_links (
  group_id uuid primary key references public.groups(id) on delete cascade,
  join_link text not null
);
grant select, insert, update, delete on public.group_links to authenticated;
grant all on public.group_links to service_role;
alter table public.group_links enable row level security;
create policy "Admins manage group links" on public.group_links for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create table public.group_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  group_id uuid not null references public.groups(id) on delete cascade,
  phone text,
  amount int not null default 0,
  status text not null default 'pending' check (status in ('pending','paid','joined','failed')),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unique (user_id, group_id)
);
grant select on public.group_memberships to authenticated;
grant all on public.group_memberships to service_role;
alter table public.group_memberships enable row level security;
create policy "Own memberships" on public.group_memberships for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- NOTIFICATIONS (broadcast)
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  kind text not null default 'info' check (kind in ('new_video','new_episode','info')),
  video_id uuid references public.videos(id) on delete cascade,
  created_at timestamptz not null default now()
);
grant select on public.notifications to authenticated;
grant insert, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "Signed in read notifications" on public.notifications for select to authenticated using (true);
create policy "Admins manage notifications" on public.notifications for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ===== FUNCTIONS & TRIGGERS =====

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _code text;
  _ref text;
  _referrer uuid;
begin
  loop
    _code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from public.profiles where referral_code = _code);
  end loop;

  insert into public.profiles (id, full_name, phone, referral_code)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), nullif(new.raw_user_meta_data->>'phone', ''), _code);

  insert into public.user_roles (user_id, role) values (new.id, 'user');

  _ref := upper(trim(coalesce(new.raw_user_meta_data->>'referral_code', '')));
  if _ref <> '' then
    select id into _referrer from public.profiles where referral_code = _ref and id <> new.id;
    if _referrer is not null then
      insert into public.referrals (referrer_id, referred_id) values (_referrer, new.id)
      on conflict (referred_id) do nothing;
    end if;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Extend a user's access by N days, starting from current expiry if still active
create or replace function public._grant_days(_user_id uuid, _days int, _package_id uuid, _source text)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare
  _start timestamptz;
  _exp timestamptz;
begin
  select greatest(coalesce(max(expires_at), now()), now()) into _start
  from public.subscriptions where user_id = _user_id;
  _exp := _start + make_interval(days => _days);
  insert into public.subscriptions (user_id, package_id, starts_at, expires_at, source)
  values (_user_id, _package_id, _start, _exp, _source);
  return _exp;
end;
$$;
revoke all on function public._grant_days(uuid, int, uuid, text) from public, anon, authenticated;

-- Customer starts a payment
create or replace function public.create_payment(_package_id uuid, _phone text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  _pkg public.packages;
  _id uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if _phone !~ '^255[67][0-9]{8}$' then raise exception 'Namba ya simu si sahihi'; end if;
  select * into _pkg from public.packages where id = _package_id and is_active;
  if _pkg.id is null then raise exception 'Kifurushi hakipatikani'; end if;
  insert into public.payments (user_id, package_id, package_name, duration_days, amount, phone, reference)
  values (auth.uid(), _pkg.id, _pkg.name, _pkg.duration_days, _pkg.price, _phone,
          'TV' || upper(substr(md5(random()::text), 1, 8)))
  returning id into _id;
  return _id;
end;
$$;
grant execute on function public.create_payment(uuid, text) to authenticated;

-- Admin confirms or rejects a payment (also used later by an M-Pesa callback)
create or replace function public.confirm_payment(_payment_id uuid, _approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  _p public.payments;
  _ref public.referrals;
  _days int;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  select * into _p from public.payments where id = _payment_id for update;
  if _p.id is null or _p.status <> 'pending' then raise exception 'Malipo hayapo au yameshashughulikiwa'; end if;
  if not _approve then
    update public.payments set status = 'failed', confirmed_at = now() where id = _p.id;
    return;
  end if;
  update public.payments set status = 'paid', confirmed_at = now() where id = _p.id;
  perform public._grant_days(_p.user_id, _p.duration_days, _p.package_id, 'payment');

  -- reward referrer once, on referred user's first paid payment
  select * into _ref from public.referrals where referred_id = _p.user_id and not rewarded for update;
  if _ref.id is not null then
    select referral_reward_days into _days from public.site_settings where id = 1;
    if coalesce(_days, 0) > 0 then
      perform public._grant_days(_ref.referrer_id, _days, null, 'referral');
    end if;
    update public.referrals set rewarded = true, rewarded_at = now() where id = _ref.id;
  end if;
end;
$$;
grant execute on function public.confirm_payment(uuid, boolean) to authenticated;

create or replace function public.admin_grant_days(_user_id uuid, _days int)
returns timestamptz language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  if _days <= 0 then raise exception 'Siku lazima ziwe zaidi ya 0'; end if;
  return public._grant_days(_user_id, _days, null, 'admin');
end;
$$;
grant execute on function public.admin_grant_days(uuid, int) to authenticated;

-- Groups: join free / request paid join
create or replace function public.join_group(_group_id uuid, _phone text)
returns text language plpgsql security definer set search_path = public as $$
declare
  _g public.groups;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into _g from public.groups where id = _group_id and is_active;
  if _g.id is null then raise exception 'Group halipatikani'; end if;
  if not _g.is_paid then
    insert into public.group_memberships (user_id, group_id, status, confirmed_at)
    values (auth.uid(), _g.id, 'joined', now())
    on conflict (user_id, group_id) do update set status = 'joined', confirmed_at = now();
    update public.groups set members_count = members_count + 1 where id = _g.id;
    return 'joined';
  end if;
  if _phone is null or _phone !~ '^255[67][0-9]{8}$' then raise exception 'Namba ya simu si sahihi'; end if;
  insert into public.group_memberships (user_id, group_id, phone, amount, status)
  values (auth.uid(), _g.id, _phone, _g.price, 'pending')
  on conflict (user_id, group_id) do update
    set phone = excluded.phone, amount = excluded.amount, status = 'pending', created_at = now()
    where public.group_memberships.status in ('pending','failed');
  return 'pending';
end;
$$;
grant execute on function public.join_group(uuid, text) to authenticated;

create or replace function public.confirm_group_payment(_membership_id uuid, _approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare _m public.group_memberships;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  select * into _m from public.group_memberships where id = _membership_id for update;
  if _m.id is null or _m.status <> 'pending' then raise exception 'Ombi halipo au limeshashughulikiwa'; end if;
  if _approve then
    update public.group_memberships set status = 'paid', confirmed_at = now() where id = _m.id;
    update public.groups set members_count = members_count + 1 where id = _m.group_id;
  else
    update public.group_memberships set status = 'failed', confirmed_at = now() where id = _m.id;
  end if;
end;
$$;
grant execute on function public.confirm_group_payment(uuid, boolean) to authenticated;

-- Link is revealed only to members (free joined or paid confirmed) or admins
create or replace function public.get_group_link(_group_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select l.join_link from public.group_links l
  where l.group_id = _group_id
    and (public.has_role(auth.uid(), 'admin')
      or exists (select 1 from public.group_memberships m
                 where m.group_id = _group_id and m.user_id = auth.uid() and m.status in ('joined','paid')))
$$;
grant execute on function public.get_group_link(uuid) to authenticated;

-- Views counter
create or replace function public.record_view(_video_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.videos set views = views + 1 where id = _video_id;
$$;
grant execute on function public.record_view(uuid) to authenticated;

-- Like / rating counters
create or replace function public.sync_video_counters()
returns trigger language plpgsql security definer set search_path = public as $$
declare _vid uuid := coalesce(new.video_id, old.video_id);
begin
  update public.videos v set
    likes_count = (select count(*) from public.likes where video_id = _vid),
    rating_avg = coalesce((select round(avg(stars)::numeric, 2) from public.ratings where video_id = _vid), 0),
    rating_count = (select count(*) from public.ratings where video_id = _vid)
  where v.id = _vid;
  return null;
end;
$$;
create trigger likes_counter after insert or delete on public.likes for each row execute function public.sync_video_counters();
create trigger ratings_counter after insert or update or delete on public.ratings for each row execute function public.sync_video_counters();

-- Auto notifications
create or replace function public.notify_new_video()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_published and not new.is_coming_soon then
    insert into public.notifications (title, body, kind, video_id)
    values ('Video mpya: ' || new.title, left(new.description, 140), 'new_video', new.id);
  end if;
  return new;
end;
$$;
create trigger videos_notify after insert on public.videos for each row execute function public.notify_new_video();

create or replace function public.notify_new_episode()
returns trigger language plpgsql security definer set search_path = public as $$
declare _title text;
begin
  select title into _title from public.videos where id = new.video_id;
  insert into public.notifications (title, body, kind, video_id)
  values ('Kipindi kipya: ' || coalesce(_title, ''), 'Kipindi ' || new.number || ' — ' || new.title, 'new_episode', new.video_id);
  return new;
end;
$$;
create trigger episodes_notify after insert on public.episodes for each row execute function public.notify_new_episode();

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end;
$$;
create trigger videos_touch before update on public.videos for each row execute function public.touch_updated_at();
