
-- STORAGE POLICIES
create policy "Admins manage media files" on storage.objects for all to authenticated
  using (bucket_id = 'media' and public.has_role(auth.uid(), 'admin'))
  with check (bucket_id = 'media' and public.has_role(auth.uid(), 'admin'));
create policy "Admins manage video files" on storage.objects for all to authenticated
  using (bucket_id = 'videos' and public.has_role(auth.uid(), 'admin'))
  with check (bucket_id = 'videos' and public.has_role(auth.uid(), 'admin'));
create policy "Subscribers read video files" on storage.objects for select to authenticated
  using (bucket_id = 'videos' and public.has_active_subscription(auth.uid()));

-- SEED: settings
insert into public.site_settings (id, site_name, intro_video_url, support_phone, support_whatsapp, support_email, paywall_delay_seconds, referral_reward_days)
values (1, 'TRANDING VIDEO', 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4',
        '+255 700 000 000', '255700000000', 'msaada@trandingvideo.co.tz', 15, 3);

-- SEED: categories
insert into public.categories (id, name, sort) values
 ('11111111-0000-0000-0000-000000000001', 'Action', 1),
 ('11111111-0000-0000-0000-000000000002', 'Drama', 2),
 ('11111111-0000-0000-0000-000000000003', 'Vichekesho', 3),
 ('11111111-0000-0000-0000-000000000004', 'Mapenzi', 4),
 ('11111111-0000-0000-0000-000000000005', 'Kusisimua', 5),
 ('11111111-0000-0000-0000-000000000006', 'Matukio', 6),
 ('11111111-0000-0000-0000-000000000007', 'Tamthilia', 7);

-- SEED: packages
insert into public.packages (name, duration_days, price, description, sort) values
 ('Siku 1', 1, 1000, 'Tazama bila kikomo kwa saa 24', 1),
 ('Wiki 1', 7, 3000, 'Siku 7 za burudani kamili', 2),
 ('Mwezi 1', 30, 10000, 'Thamani bora — siku 30 kamili', 3);

-- SEED: videos (insert without triggering notifications noise is fine)
insert into public.videos (id, title, description, year, category_id, kind, thumbnail_url, banner_url, trailer_url, duration_minutes, is_featured, is_coming_soon, publish_at, views, likes_count) values
 ('22222222-0000-0000-0000-000000000001', 'Kivuli cha Usiku', 'Askari wa zamani anarudi Dar es Salaam usiku mmoja kulipiza kisasi dhidi ya genge lililoangamiza familia yake. Kila kivuli kina siri.', 2026, '11111111-0000-0000-0000-000000000001', 'movie', '/images/poster-kivuli.jpg', '/images/banner-kivuli.jpg', 'https://media.w3.org/2010/05/sintel/trailer.mp4', 112, true, false, now() - interval '2 days', 4210, 380),
 ('22222222-0000-0000-0000-000000000002', 'Mfalme wa Pwani', 'Mvuvi kijana anagundua kwamba ni mrithi wa ufalme wa kale wa pwani, na lazima achague kati ya mapenzi na wajibu.', 2025, '11111111-0000-0000-0000-000000000002', 'movie', '/images/poster-mfalme.jpg', null, 'https://media.w3.org/2010/05/bunny/trailer.mp4', 128, false, false, now() - interval '20 days', 3120, 512),
 ('22222222-0000-0000-0000-000000000003', 'Moto wa Jangwani', 'Kikosi maalum kinatumwa jangwani kuokoa mateka kabla ya muda kuisha. Mapigano makali, kasi ya ajabu.', 2026, '11111111-0000-0000-0000-000000000001', 'movie', '/images/poster-moto.jpg', null, 'https://vjs.zencdn.net/v/oceans.mp4', 104, false, false, now() - interval '5 days', 2890, 260),
 ('22222222-0000-0000-0000-000000000004', 'Siri ya Kilimanjaro', 'Wapanda mlima watano wanakutana na siri iliyofichwa kwenye barafu ya Kilimanjaro kwa karne nyingi.', 2025, '11111111-0000-0000-0000-000000000006', 'movie', '/images/poster-kilimanjaro.jpg', null, 'https://media.w3.org/2010/05/sintel/trailer.mp4', 119, false, false, now() - interval '40 days', 1980, 301),
 ('22222222-0000-0000-0000-000000000005', 'Penzi la Zanzibar', 'Msanii wa Stone Town anakutana na mgeni wa ajabu wakati wa tamasha la muziki. Hadithi ya mapenzi isiyosahaulika.', 2024, '11111111-0000-0000-0000-000000000004', 'movie', '/images/poster-zanzibar.jpg', null, 'https://media.w3.org/2010/05/bunny/trailer.mp4', 98, false, false, now() - interval '90 days', 5230, 640),
 ('22222222-0000-0000-0000-000000000006', 'Mji wa Vivuli', 'Mpelelezi anafuatilia mfululizo wa matukio ya ajabu katika mji usiolala. Inakuja hivi karibuni.', 2026, '11111111-0000-0000-0000-000000000005', 'movie', '/images/poster-mji.jpg', null, 'https://vjs.zencdn.net/v/oceans.mp4', 110, false, true, now() + interval '20 days', 0, 0),
 ('22222222-0000-0000-0000-000000000007', 'Vicheko Mtaani', 'Majirani watatu wa Kariakoo wanaanzisha biashara ya ajabu — na kila kitu kinaenda kombo kwa njia ya kuchekesha.', 2025, '11111111-0000-0000-0000-000000000003', 'movie', '/images/poster-vicheko.jpg', null, 'https://media.w3.org/2010/05/bunny/trailer.mp4', 92, false, false, now() - interval '12 days', 2450, 420),
 ('22222222-0000-0000-0000-000000000008', 'Safari ya Mwisho', 'Baba na mwanawe wanasafiri kutoka Mwanza hadi Mtwara kutimiza ahadi ya mwisho. Safari inayogusa moyo.', 2024, '11111111-0000-0000-0000-000000000002', 'movie', '/images/poster-safari.jpg', null, 'https://media.w3.org/2010/05/sintel/trailer.mp4', 115, false, false, now() - interval '60 days', 1720, 355),
 ('22222222-0000-0000-0000-000000000009', 'Familia ya Dar', 'Tamthilia ya familia tajiri ya Masaki inayokumbwa na siri, wivu na vita vya urithi.', 2026, '11111111-0000-0000-0000-000000000007', 'series', '/images/poster-familia.jpg', '/images/banner-familia.jpg', 'https://vjs.zencdn.net/v/oceans.mp4', null, true, false, now() - interval '1 day', 6100, 710),
 ('22222222-0000-0000-0000-000000000010', 'Jiji la Dhahabu', 'Wachimbaji wadogo wa Geita wanagundua dhahabu nyingi — na kuvutia hatari wasiyoitarajia.', 2025, '11111111-0000-0000-0000-000000000007', 'series', '/images/poster-dhahabu.jpg', null, 'https://media.w3.org/2010/05/bunny/trailer.mp4', null, false, false, now() - interval '30 days', 3400, 290);

-- movie files
insert into public.video_files (video_id, url, quality, subtitle_url, subtitle_label)
select id, case (row_number() over (order by id)) % 3
    when 0 then 'https://media.w3.org/2010/05/bunny/movie.mp4'
    when 1 then 'https://media.w3.org/2010/05/sintel/trailer.mp4'
    else 'https://vjs.zencdn.net/v/oceans.mp4' end,
  '720p', '/subtitles/demo-sw.vtt', 'Kiswahili'
from public.videos where kind = 'movie';

-- series seasons/episodes
insert into public.seasons (id, video_id, number, title) values
 ('33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000009', 1, 'Msimu wa 1'),
 ('33333333-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000009', 2, 'Msimu wa 2'),
 ('33333333-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000010', 1, 'Msimu wa 1');

insert into public.episodes (id, season_id, video_id, number, title, description, duration_minutes) values
 ('44444444-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000009', 1, 'Urithi', 'Mzee Juma anafariki na wosia wake unashtua kila mtu.', 45),
 ('44444444-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000009', 2, 'Siri ya Mama', 'Barua ya zamani inafichua ukweli uliofichwa kwa miaka 20.', 44),
 ('44444444-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000009', 3, 'Usaliti', 'Ndugu wawili wanagombana mbele ya wageni wa harusi.', 47),
 ('44444444-0000-0000-0000-000000000004', '33333333-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000009', 1, 'Kurudi', 'Mtoto aliyepotea anarudi nyumbani akiwa na mpango.', 46),
 ('44444444-0000-0000-0000-000000000005', '33333333-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000009', 2, 'Mahakamani', 'Vita vya urithi vinafika mahakamani.', 48),
 ('44444444-0000-0000-0000-000000000006', '33333333-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000010', 1, 'Mwamba wa Kwanza', 'Baraka anapata kipande cha dhahabu kikubwa kuliko vyote.', 42),
 ('44444444-0000-0000-0000-000000000007', '33333333-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000010', 2, 'Wageni', 'Wanunuzi wa ajabu wanawasili kijijini.', 43),
 ('44444444-0000-0000-0000-000000000008', '33333333-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000010', 3, 'Usiku wa Moto', 'Mgodi unashambuliwa usiku wa manane.', 45),
 ('44444444-0000-0000-0000-000000000009', '33333333-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000010', 4, 'Dhahabu au Damu', 'Uamuzi mgumu unaobadilisha kila kitu.', 50);

insert into public.video_files (video_id, episode_id, url, quality, subtitle_url, subtitle_label)
select video_id, id, case number % 2 when 0 then 'https://media.w3.org/2010/05/bunny/movie.mp4' else 'https://vjs.zencdn.net/v/oceans.mp4' end,
  '720p', '/subtitles/demo-sw.vtt', 'Kiswahili'
from public.episodes;

-- SEED: groups
insert into public.groups (id, name, description, category, image_url, members_count, is_paid, price, sort) values
 ('55555555-0000-0000-0000-000000000001', 'Wajasiriamali Tanzania', 'Mbinu za biashara, mitaji na fursa mpya kila siku. Jifunze kutoka kwa wafanyabiashara waliofanikiwa.', 'Biashara', '/images/group-biashara.jpg', 1240, true, 5000, 1),
 ('55555555-0000-0000-0000-000000000002', 'Wapenzi wa Tamthilia', 'Jadili vipindi vipya, pata taarifa za kwanza za tamthilia mpya na kura za wiki.', 'Filamu na Tamthilia', '/images/group-filamu.jpg', 3580, false, 0, 2),
 ('55555555-0000-0000-0000-000000000003', 'Bongo Flava Hub', 'Nyimbo mpya, habari za wasanii na mijadala ya muziki wa nyumbani.', 'Muziki', '/images/group-muziki.jpg', 2210, false, 0, 3),
 ('55555555-0000-0000-0000-000000000004', 'Darasa la Kidijitali', 'Masomo ya kompyuta, simu na ujuzi wa mtandaoni kwa Kiswahili rahisi.', 'Elimu', '/images/group-elimu.jpg', 860, true, 3000, 4),
 ('55555555-0000-0000-0000-000000000005', 'Soko la Mtandaoni', 'Uza na nunua bidhaa kwa usalama. Matangazo ya biashara kila siku.', 'Biashara', '/images/group-biashara.jpg', 4100, false, 0, 5);

insert into public.group_links (group_id, join_link) values
 ('55555555-0000-0000-0000-000000000001', 'https://chat.whatsapp.com/'),
 ('55555555-0000-0000-0000-000000000002', 'https://chat.whatsapp.com/'),
 ('55555555-0000-0000-0000-000000000003', 'https://t.me/'),
 ('55555555-0000-0000-0000-000000000004', 'https://t.me/'),
 ('55555555-0000-0000-0000-000000000005', 'https://chat.whatsapp.com/');
