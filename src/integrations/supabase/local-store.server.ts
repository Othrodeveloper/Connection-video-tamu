import fs from "node:fs";
import path from "node:path";
import type { Session, User } from "@supabase/supabase-js";

type Row = Record<string, unknown>;

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";
const DEMO_ADMIN_ID = "00000000-0000-0000-0000-000000000002";
const DB_FILE = "/tmp/tranding-db.json";
const MEDIA_ROOT = "/tmp/tranding-media";

function agoIso(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function aheadIso(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

interface MockAuthAccount {
  id: string;
  email: string;
  password: string;
  phone: string;
  full_name: string;
}

interface StoreState {
  db: Record<string, Row[]>;
  accounts: MockAuthAccount[];
}

function createInitialState(): StoreState {
  const now = new Date().toISOString();
  return {
    accounts: [
      {
        id: DEMO_USER_ID,
        email: "255754000000@simu.trandingvideo.app",
        password: "password",
        phone: "255754000000",
        full_name: "Amina Juma",
      },
      {
        id: DEMO_ADMIN_ID,
        email: "255700000000@simu.trandingvideo.app",
        password: "password",
        phone: "255700000000",
        full_name: "Admin Mkuu",
      },
    ],
    db: {
      site_settings: [
        {
          id: 1,
          site_name: "TRANDING VIDEO",
          logo_url: null,
          intro_video_url:
            "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4",
          support_phone: "+255 700 000 000",
          support_whatsapp: "255700000000",
          support_email: "msaada@trandingvideo.co.tz",
          support_instagram: null,
          support_facebook: null,
          support_tiktok: null,
          support_telegram: null,
          support_hours: "Jumatatu - Jumapili, 08:00 - 22:00",
          support_message: null,
          paywall_delay_seconds: 15,
          referral_reward_days: 1,
          trial_seconds: 5,
          welcome_minutes: 0,
          payment_instructions:
            "Chagua kifurushi kisha thibitisha namba yako ya simu au tumia malipo ya manual na Access PIN.",
          texts: {},
          content: {
            manual_payment_number: "0754 000 000",
            manual_payment_name: "TRANDING VIDEO",
          },
          updated_at: now,
        },
      ],
      categories: [
        { id: "11111111-0000-0000-0000-000000000001", name: "Action", sort: 1, created_at: now },
        { id: "11111111-0000-0000-0000-000000000002", name: "Drama", sort: 2, created_at: now },
        {
          id: "11111111-0000-0000-0000-000000000003",
          name: "Vichekesho",
          sort: 3,
          created_at: now,
        },
        { id: "11111111-0000-0000-0000-000000000004", name: "Mapenzi", sort: 4, created_at: now },
        { id: "11111111-0000-0000-0000-000000000005", name: "Kusisimua", sort: 5, created_at: now },
        { id: "11111111-0000-0000-0000-000000000006", name: "Matukio", sort: 6, created_at: now },
        { id: "11111111-0000-0000-0000-000000000007", name: "Tamthilia", sort: 7, created_at: now },
      ],
      packages: [
        {
          id: "aaaa1111-0000-0000-0000-000000000001",
          name: "Siku 1",
          duration_days: 1,
          price: 1000,
          description: "Tazama bila kikomo kwa saa 24",
          is_active: true,
          sort: 1,
          created_at: now,
        },
        {
          id: "aaaa1111-0000-0000-0000-000000000002",
          name: "Wiki 1",
          duration_days: 7,
          price: 3000,
          description: "Siku 7 za burudani kamili",
          is_active: true,
          sort: 2,
          created_at: now,
        },
        {
          id: "aaaa1111-0000-0000-0000-000000000003",
          name: "Mwezi 1",
          duration_days: 30,
          price: 10000,
          description: "Thamani bora — siku 30 kamili",
          is_active: true,
          sort: 3,
          created_at: now,
        },
      ],
      videos: [
        {
          id: "22222222-0000-0000-0000-000000000001",
          title: "Kivuli cha Usiku",
          description:
            "Askari wa zamani anarudi Dar es Salaam usiku mmoja kulipiza kisasi dhidi ya genge lililoangamiza familia yake. Kila kivuli kina siri.",
          year: 2026,
          category_id: "11111111-0000-0000-0000-000000000001",
          kind: "movie",
          thumbnail_url: "/images/poster-kivuli.jpg",
          banner_url: "/images/banner-kivuli.jpg",
          trailer_url: "https://media.w3.org/2010/05/sintel/trailer.mp4",
          duration_minutes: 112,
          is_featured: true,
          is_coming_soon: false,
          is_published: true,
          publish_at: agoIso(2),
          views: 4210,
          likes_count: 380,
          rating_avg: 4.8,
          rating_count: 42,
          created_at: agoIso(2),
          updated_at: now,
        },
        {
          id: "22222222-0000-0000-0000-000000000002",
          title: "Mfalme wa Pwani",
          description:
            "Mvuvi kijana anagundua kwamba ni mrithi wa ufalme wa kale wa pwani, na lazima achague kati ya mapenzi na wajibu.",
          year: 2025,
          category_id: "11111111-0000-0000-0000-000000000002",
          kind: "movie",
          thumbnail_url: "/images/poster-mfalme.jpg",
          banner_url: null,
          trailer_url: "https://media.w3.org/2010/05/bunny/trailer.mp4",
          duration_minutes: 128,
          is_featured: false,
          is_coming_soon: false,
          is_published: true,
          publish_at: agoIso(20),
          views: 3120,
          likes_count: 512,
          rating_avg: 4.7,
          rating_count: 31,
          created_at: agoIso(20),
          updated_at: now,
        },
        {
          id: "22222222-0000-0000-0000-000000000003",
          title: "Moto wa Jangwani",
          description:
            "Kikosi maalum kinatumwa jangwani kuokoa mateka kabla ya muda kuisha. Mapigano makali, kasi ya ajabu.",
          year: 2026,
          category_id: "11111111-0000-0000-0000-000000000001",
          kind: "movie",
          thumbnail_url: "/images/poster-moto.jpg",
          banner_url: null,
          trailer_url: "https://vjs.zencdn.net/v/oceans.mp4",
          duration_minutes: 104,
          is_featured: false,
          is_coming_soon: false,
          is_published: true,
          publish_at: agoIso(5),
          views: 2890,
          likes_count: 260,
          rating_avg: 4.5,
          rating_count: 19,
          created_at: agoIso(5),
          updated_at: now,
        },
        {
          id: "22222222-0000-0000-0000-000000000004",
          title: "Siri ya Kilimanjaro",
          description:
            "Wapanda mlima watano wanakutana na siri iliyofichwa kwenye barafu ya Kilimanjaro kwa karne nyingi.",
          year: 2025,
          category_id: "11111111-0000-0000-0000-000000000006",
          kind: "movie",
          thumbnail_url: "/images/poster-kilimanjaro.jpg",
          banner_url: null,
          trailer_url: "https://media.w3.org/2010/05/sintel/trailer.mp4",
          duration_minutes: 119,
          is_featured: false,
          is_coming_soon: false,
          is_published: true,
          publish_at: agoIso(40),
          views: 1980,
          likes_count: 301,
          rating_avg: 4.6,
          rating_count: 22,
          created_at: agoIso(40),
          updated_at: now,
        },
        {
          id: "22222222-0000-0000-0000-000000000005",
          title: "Penzi la Zanzibar",
          description:
            "Msanii wa Stone Town anakutana na mgeni wa ajabu wakati wa tamasha la muziki. Hadithi ya mapenzi isiyosahaulika.",
          year: 2024,
          category_id: "11111111-0000-0000-0000-000000000004",
          kind: "movie",
          thumbnail_url: "/images/poster-zanzibar.jpg",
          banner_url: null,
          trailer_url: "https://media.w3.org/2010/05/bunny/trailer.mp4",
          duration_minutes: 98,
          is_featured: false,
          is_coming_soon: false,
          is_published: true,
          publish_at: agoIso(90),
          views: 5230,
          likes_count: 640,
          rating_avg: 4.9,
          rating_count: 58,
          created_at: agoIso(90),
          updated_at: now,
        },
        {
          id: "22222222-0000-0000-0000-000000000006",
          title: "Mji wa Vivuli",
          description:
            "Mpelelezi anafuatilia mfululizo wa matukio ya ajabu katika mji usiolala. Inakuja hivi karibuni.",
          year: 2026,
          category_id: "11111111-0000-0000-0000-000000000005",
          kind: "movie",
          thumbnail_url: "/images/poster-mji.jpg",
          banner_url: null,
          trailer_url: "https://vjs.zencdn.net/v/oceans.mp4",
          duration_minutes: 110,
          is_featured: false,
          is_coming_soon: true,
          is_published: true,
          publish_at: aheadIso(20),
          views: 0,
          likes_count: 0,
          rating_avg: 0,
          rating_count: 0,
          created_at: now,
          updated_at: now,
        },
        {
          id: "22222222-0000-0000-0000-000000000007",
          title: "Vicheko Mtaani",
          description:
            "Majirani watatu wa Kariakoo wanaanzisha biashara ya ajabu — na kila kitu kinaenda kombo kwa njia ya kuchekesha.",
          year: 2025,
          category_id: "11111111-0000-0000-0000-000000000003",
          kind: "movie",
          thumbnail_url: "/images/poster-vicheko.jpg",
          banner_url: null,
          trailer_url: "https://media.w3.org/2010/05/bunny/trailer.mp4",
          duration_minutes: 92,
          is_featured: false,
          is_coming_soon: false,
          is_published: true,
          publish_at: agoIso(12),
          views: 2450,
          likes_count: 420,
          rating_avg: 4.4,
          rating_count: 25,
          created_at: agoIso(12),
          updated_at: now,
        },
        {
          id: "22222222-0000-0000-0000-000000000008",
          title: "Safari ya Mwisho",
          description:
            "Baba na mwanawe wanasafiri kutoka Mwanza hadi Mtwara kutimiza ahadi ya mwisho. Safari inayogusa moyo.",
          year: 2024,
          category_id: "11111111-0000-0000-0000-000000000002",
          kind: "movie",
          thumbnail_url: "/images/poster-safari.jpg",
          banner_url: null,
          trailer_url: "https://media.w3.org/2010/05/sintel/trailer.mp4",
          duration_minutes: 115,
          is_featured: false,
          is_coming_soon: false,
          is_published: true,
          publish_at: agoIso(60),
          views: 1720,
          likes_count: 355,
          rating_avg: 4.7,
          rating_count: 18,
          created_at: agoIso(60),
          updated_at: now,
        },
        {
          id: "22222222-0000-0000-0000-000000000009",
          title: "Familia ya Dar",
          description:
            "Tamthilia ya familia tajiri ya Masaki inayokumbwa na siri, wivu na vita vya urithi.",
          year: 2026,
          category_id: "11111111-0000-0000-0000-000000000007",
          kind: "series",
          thumbnail_url: "/images/poster-familia.jpg",
          banner_url: "/images/banner-familia.jpg",
          trailer_url: "https://vjs.zencdn.net/v/oceans.mp4",
          duration_minutes: null,
          is_featured: true,
          is_coming_soon: false,
          is_published: true,
          publish_at: agoIso(1),
          views: 6100,
          likes_count: 710,
          rating_avg: 4.9,
          rating_count: 74,
          created_at: agoIso(1),
          updated_at: now,
        },
        {
          id: "22222222-0000-0000-0000-000000000010",
          title: "Jiji la Dhahabu",
          description:
            "Wachimbaji wadogo wa Geita wanagundua dhahabu nyingi — na kuvutia hatari wasiyoitarajia.",
          year: 2025,
          category_id: "11111111-0000-0000-0000-000000000007",
          kind: "series",
          thumbnail_url: "/images/poster-dhahabu.jpg",
          banner_url: null,
          trailer_url: "https://media.w3.org/2010/05/bunny/trailer.mp4",
          duration_minutes: null,
          is_featured: false,
          is_coming_soon: false,
          is_published: true,
          publish_at: agoIso(30),
          views: 3400,
          likes_count: 290,
          rating_avg: 4.6,
          rating_count: 29,
          created_at: agoIso(30),
          updated_at: now,
        },
      ],
      seasons: [
        {
          id: "33333333-0000-0000-0000-000000000001",
          video_id: "22222222-0000-0000-0000-000000000009",
          number: 1,
          title: "Msimu wa 1",
        },
        {
          id: "33333333-0000-0000-0000-000000000002",
          video_id: "22222222-0000-0000-0000-000000000009",
          number: 2,
          title: "Msimu wa 2",
        },
        {
          id: "33333333-0000-0000-0000-000000000003",
          video_id: "22222222-0000-0000-0000-000000000010",
          number: 1,
          title: "Msimu wa 1",
        },
      ],
      episodes: [
        {
          id: "44444444-0000-0000-0000-000000000001",
          season_id: "33333333-0000-0000-0000-000000000001",
          video_id: "22222222-0000-0000-0000-000000000009",
          number: 1,
          title: "Urithi",
          description: "Mzee Juma anafariki na wosia wake unashtua kila mtu.",
          duration_minutes: 45,
          thumbnail_url: null,
          created_at: now,
        },
        {
          id: "44444444-0000-0000-0000-000000000002",
          season_id: "33333333-0000-0000-0000-000000000001",
          video_id: "22222222-0000-0000-0000-000000000009",
          number: 2,
          title: "Siri ya Mama",
          description: "Barua ya zamani inafichua ukweli uliofichwa kwa miaka 20.",
          duration_minutes: 44,
          thumbnail_url: null,
          created_at: now,
        },
        {
          id: "44444444-0000-0000-0000-000000000003",
          season_id: "33333333-0000-0000-0000-000000000001",
          video_id: "22222222-0000-0000-0000-000000000009",
          number: 3,
          title: "Usaliti",
          description: "Ndugu wawili wanagombana mbele ya wageni wa harusi.",
          duration_minutes: 47,
          thumbnail_url: null,
          created_at: now,
        },
        {
          id: "44444444-0000-0000-0000-000000000004",
          season_id: "33333333-0000-0000-0000-000000000002",
          video_id: "22222222-0000-0000-0000-000000000009",
          number: 1,
          title: "Kurudi",
          description: "Mtoto aliyepotea anarudi nyumbani akiwa na mpango.",
          duration_minutes: 46,
          thumbnail_url: null,
          created_at: now,
        },
        {
          id: "44444444-0000-0000-0000-000000000005",
          season_id: "33333333-0000-0000-0000-000000000002",
          video_id: "22222222-0000-0000-0000-000000000009",
          number: 2,
          title: "Mahakamani",
          description: "Vita vya urithi vinafika mahakamani.",
          duration_minutes: 48,
          thumbnail_url: null,
          created_at: now,
        },
        {
          id: "44444444-0000-0000-0000-000000000006",
          season_id: "33333333-0000-0000-0000-000000000003",
          video_id: "22222222-0000-0000-0000-000000000010",
          number: 1,
          title: "Mwamba wa Kwanza",
          description: "Baraka anapata kipande cha dhahabu kikubwa kuliko vyote.",
          duration_minutes: 42,
          thumbnail_url: null,
          created_at: now,
        },
        {
          id: "44444444-0000-0000-0000-000000000007",
          season_id: "33333333-0000-0000-0000-000000000003",
          video_id: "22222222-0000-0000-0000-000000000010",
          number: 2,
          title: "Wageni",
          description: "Wanunuzi wa ajabu wanawasili kijijini.",
          duration_minutes: 43,
          thumbnail_url: null,
          created_at: now,
        },
        {
          id: "44444444-0000-0000-0000-000000000008",
          season_id: "33333333-0000-0000-0000-000000000003",
          video_id: "22222222-0000-0000-0000-000000000010",
          number: 3,
          title: "Usiku wa Moto",
          description: "Mgodi unashambuliwa usiku wa manane.",
          duration_minutes: 45,
          thumbnail_url: null,
          created_at: now,
        },
        {
          id: "44444444-0000-0000-0000-000000000009",
          season_id: "33333333-0000-0000-0000-000000000003",
          video_id: "22222222-0000-0000-0000-000000000010",
          number: 4,
          title: "Dhahabu au Damu",
          description: "Uamuzi mgumu unaobadilisha kila kitu.",
          duration_minutes: 50,
          thumbnail_url: null,
          created_at: now,
        },
      ],
      video_files: [
        ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
          id: `vf-movie-${n}`,
          video_id: `22222222-0000-0000-0000-00000000000${n}`,
          episode_id: null,
          url:
            n % 3 === 0
              ? "https://media.w3.org/2010/05/bunny/movie.mp4"
              : n % 3 === 1
                ? "https://media.w3.org/2010/05/sintel/trailer.mp4"
                : "https://vjs.zencdn.net/v/oceans.mp4",
          quality: "720p",
          subtitle_url: "/subtitles/demo-sw.vtt",
          subtitle_label: "Kiswahili",
          created_at: now,
        })),
        ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({
          id: `vf-ep-${n}`,
          video_id:
            n <= 5
              ? "22222222-0000-0000-0000-000000000009"
              : "22222222-0000-0000-0000-000000000010",
          episode_id: `44444444-0000-0000-0000-00000000000${n}`,
          url:
            n % 2 === 0
              ? "https://media.w3.org/2010/05/bunny/movie.mp4"
              : "https://vjs.zencdn.net/v/oceans.mp4",
          quality: "720p",
          subtitle_url: "/subtitles/demo-sw.vtt",
          subtitle_label: "Kiswahili",
          created_at: now,
        })),
      ],
      groups: [
        {
          id: "55555555-0000-0000-0000-000000000001",
          name: "Wajasiriamali Tanzania",
          description:
            "Mbinu za biashara, mitaji na fursa mpya kila siku. Jifunze kutoka kwa wafanyabiashara waliofanikiwa.",
          category: "Biashara",
          image_url: "/images/group-biashara.jpg",
          members_count: 1240,
          is_paid: true,
          price: 5000,
          is_active: true,
          sort: 1,
          created_at: now,
        },
        {
          id: "55555555-0000-0000-0000-000000000002",
          name: "Wapenzi wa Tamthilia",
          description:
            "Jadili vipindi vipya, pata taarifa za kwanza za tamthilia mpya na kura za wiki.",
          category: "Filamu na Tamthilia",
          image_url: "/images/group-filamu.jpg",
          members_count: 3580,
          is_paid: false,
          price: 0,
          is_active: true,
          sort: 2,
          created_at: now,
        },
        {
          id: "55555555-0000-0000-0000-000000000003",
          name: "Bongo Flava Hub",
          description: "Nyimbo mpya, habari za wasanii na mijadala ya muziki wa nyumbani.",
          category: "Muziki",
          image_url: "/images/group-muziki.jpg",
          members_count: 2210,
          is_paid: false,
          price: 0,
          is_active: true,
          sort: 3,
          created_at: now,
        },
        {
          id: "55555555-0000-0000-0000-000000000004",
          name: "Darasa la Kidijitali",
          description: "Masomo ya kompyuta, simu na ujuzi wa mtandaoni kwa Kiswahili rahisi.",
          category: "Elimu",
          image_url: "/images/group-elimu.jpg",
          members_count: 860,
          is_paid: true,
          price: 3000,
          is_active: true,
          sort: 4,
          created_at: now,
        },
        {
          id: "55555555-0000-0000-0000-000000000005",
          name: "Soko la Mtandaoni",
          description: "Uza na nunua bidhaa kwa usalama. Matangazo ya biashara kila siku.",
          category: "Biashara",
          image_url: "/images/group-biashara.jpg",
          members_count: 4100,
          is_paid: false,
          price: 0,
          is_active: true,
          sort: 5,
          created_at: now,
        },
      ],
      group_links: [
        {
          group_id: "55555555-0000-0000-0000-000000000001",
          join_link: "https://chat.whatsapp.com/",
        },
        {
          group_id: "55555555-0000-0000-0000-000000000002",
          join_link: "https://chat.whatsapp.com/",
        },
        { group_id: "55555555-0000-0000-0000-000000000003", join_link: "https://t.me/" },
        { group_id: "55555555-0000-0000-0000-000000000004", join_link: "https://t.me/" },
        {
          group_id: "55555555-0000-0000-0000-000000000005",
          join_link: "https://chat.whatsapp.com/",
        },
      ],
      group_slides: [],
      notifications: [
        {
          id: "notif-1",
          title: "Karibu TRANDING VIDEO!",
          body: "Filamu mpya ya Kivuli cha Usiku na tamthilia ya Familia ya Dar zinapatikana sasa.",
          kind: "info",
          video_id: "22222222-0000-0000-0000-000000000001",
          created_at: agoIso(1),
        },
      ],
      profiles: [
        {
          id: DEMO_USER_ID,
          full_name: "Amina Juma",
          phone: "255754000000",
          avatar_url: null,
          referral_code: "AMINA1",
          is_verified: true,
          is_blocked: false,
          notify_new_videos: true,
          notify_new_episodes: true,
          notify_expiry: true,
          notifications_seen_at: agoIso(5),
          channel_followed_at: null,
          channel_invite_dismissed_at: null,
          created_at: agoIso(10),
        },
        {
          id: DEMO_ADMIN_ID,
          full_name: "Admin Mkuu",
          phone: "255700000000",
          avatar_url: null,
          referral_code: "ADMIN1",
          is_verified: true,
          is_blocked: false,
          notify_new_videos: true,
          notify_new_episodes: true,
          notify_expiry: true,
          notifications_seen_at: agoIso(1),
          channel_followed_at: null,
          channel_invite_dismissed_at: null,
          created_at: agoIso(30),
        },
      ],
      user_roles: [{ id: "role-admin-1", user_id: DEMO_ADMIN_ID, role: "admin" }],
      staff_permissions: [],
      subscriptions: [
        {
          id: "sub-demo-1",
          user_id: DEMO_USER_ID,
          package_id: "aaaa1111-0000-0000-0000-000000000003",
          source: "payment",
          starts_at: agoIso(2),
          expires_at: aheadIso(28),
          created_at: agoIso(2),
        },
      ],
      payments: [],
      access_tokens: [],
      watchlist: [],
      likes: [],
      watch_progress: [],
      ratings: [],
      referrals: [],
      group_memberships: [],
      site_visits: [],
      video_views: [],
      trial_passes: [],
      payment_config: [
        {
          id: 1,
          provider: "sonicpesa",
          api_key: "",
          api_secret: "",
          base_url: "https://api.sonicpesa.com/api/v1",
          enabled: false,
          test_request_id: null,
          test_swapped: false,
          updated_at: now,
        },
      ],
    },
  };
}

const g = globalThis as unknown as {
  __TRANDING_SERVER_STORE__?: StoreState;
  __TRANDING_LOCAL_EXEC__?: (payload: LocalExecPayload) => Promise<unknown>;
};

function loadStore(): StoreState {
  if (g.__TRANDING_SERVER_STORE__) return g.__TRANDING_SERVER_STORE__;
  try {
    if (fs.existsSync(DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, "utf8")) as StoreState;
      if (parsed?.db && Array.isArray(parsed.accounts)) {
        if (!parsed.db["access_tokens"]) parsed.db["access_tokens"] = [];
        g.__TRANDING_SERVER_STORE__ = parsed;
        return parsed;
      }
    }
  } catch {
    /* ignore corrupt temp file and reseed */
  }
  const initial = createInitialState();
  g.__TRANDING_SERVER_STORE__ = initial;
  saveStore(initial);
  return initial;
}

function saveStore(st: StoreState) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(st), "utf8");
  } catch {
    /* ignore disk write failure */
  }
}

export interface SerializedFilter {
  type: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "is" | "not" | "ilike" | "or";
  col?: string;
  val?: unknown;
  op?: string;
  expr?: string;
}

export interface LocalQueryPayload {
  kind: "query";
  table: string;
  op: "select" | "insert" | "update" | "upsert" | "delete";
  selectExpr: string;
  countMode: boolean;
  headMode: boolean;
  payload: unknown;
  filters: SerializedFilter[];
  orders: Array<{ col: string; ascending: boolean }>;
  limitN: number | null;
  singleMode: "none" | "single" | "maybeSingle";
}

export interface LocalRpcPayload {
  kind: "rpc";
  fn: string;
  args: Record<string, unknown>;
  singleMode: boolean;
  userId?: string | null;
}

export interface LocalAuthPayload {
  kind: "auth";
  action:
    "signUp" | "signInWithPassword" | "getUser" | "getClaims" | "deleteUser" | "updatePassword";
  email?: string;
  password?: string;
  options?: { data?: { full_name?: string; phone?: string; referral_code?: string } };
  token?: string;
  userId?: string | null;
}

export type LocalExecPayload = LocalQueryPayload | LocalRpcPayload | LocalAuthPayload;

function parseValue(val: unknown): number | string {
  if (typeof val === "number") return val;
  if (typeof val === "string") return val;
  return String(val ?? "");
}

function buildFilterFn(f: SerializedFilter): (r: Row) => boolean {
  const col = f.col ?? "";
  switch (f.type) {
    case "eq":
      return (r) => r[col] === f.val;
    case "neq":
      return (r) => r[col] !== f.val;
    case "gt":
      return (r) => parseValue(r[col]) > parseValue(f.val);
    case "gte":
      return (r) => parseValue(r[col]) >= parseValue(f.val);
    case "lt":
      return (r) => parseValue(r[col]) < parseValue(f.val);
    case "lte":
      return (r) => parseValue(r[col]) <= parseValue(f.val);
    case "in": {
      const set = new Set(Array.isArray(f.val) ? f.val : []);
      return (r) => set.has(r[col]);
    }
    case "is":
      return (r) => (f.val === null ? r[col] === null || r[col] === undefined : r[col] === f.val);
    case "not":
      if (f.op === "is" && f.val === null) return (r) => r[col] !== null && r[col] !== undefined;
      if (f.op === "eq") return (r) => r[col] !== f.val;
      return () => true;
    case "ilike": {
      const needle = String(f.val ?? "")
        .replace(/%/g, "")
        .toLowerCase();
      return (r) =>
        String(r[col] ?? "")
          .toLowerCase()
          .includes(needle);
    }
    case "or": {
      const clauses = String(f.expr ?? "")
        .split(",")
        .map((c) => c.trim());
      return (r) =>
        clauses.some((clause) => {
          const parts = clause.split(".");
          const c = parts[0] ?? "";
          const op = parts[1] ?? "";
          const rest = parts.slice(2).join(".");
          if (op === "ilike") {
            const needle = rest.replace(/%/g, "").toLowerCase();
            return String(r[c] ?? "")
              .toLowerCase()
              .includes(needle);
          }
          if (op === "eq") return String(r[c] ?? "") === rest;
          if (op === "neq") return String(r[c] ?? "") !== rest;
          if (op === "is" && rest === "null") return r[c] === null || r[c] === undefined;
          return true;
        });
    }
  }
}

function enrichRelations(st: StoreState, table: string, row: Row, selectExpr: string): Row {
  const out = { ...row };
  if (selectExpr.includes("category:categories(") && table === "videos") {
    const cat = (st.db["categories"] ?? []).find((c) => c["id"] === row["category_id"]);
    out["category"] = cat ? { name: cat["name"] } : null;
  }
  if (selectExpr.includes("season:seasons(") && table === "episodes") {
    const season = (st.db["seasons"] ?? []).find((s) => s["id"] === row["season_id"]);
    out["season"] = season ? { number: season["number"] } : null;
  }
  if (selectExpr.includes("episodes(") && table === "seasons") {
    out["episodes"] = (st.db["episodes"] ?? [])
      .filter((e) => e["season_id"] === row["id"])
      .sort((a, b) => Number(a["number"] ?? 0) - Number(b["number"] ?? 0));
  }
  if (selectExpr.includes("group:groups(") && table === "group_memberships") {
    const grp = (st.db["groups"] ?? []).find((gItem) => gItem["id"] === row["group_id"]);
    out["group"] = grp ? { name: grp["name"] } : null;
  }
  if (selectExpr.includes("video:videos(") && table === "watch_progress") {
    const vid = (st.db["videos"] ?? []).find((v) => v["id"] === row["video_id"]);
    out["video"] = vid ? { title: vid["title"] } : null;
  }
  return out;
}

function buildSession(acc: MockAuthAccount): Session {
  const user: User = {
    id: acc.id,
    aud: "authenticated",
    role: "authenticated",
    email: acc.email,
    phone: acc.phone,
    app_metadata: {},
    user_metadata: { full_name: acc.full_name, phone: acc.phone },
    created_at: new Date().toISOString(),
  };
  return {
    access_token: `mock.${acc.id}.token`,
    refresh_token: `mock.${acc.id}.refresh`,
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user,
  };
}

function runQuery(st: StoreState, q: LocalQueryPayload) {
  if (!st.db[q.table]) st.db[q.table] = [];
  const rows = st.db[q.table]!;
  const filterFns = (q.filters ?? []).map(buildFilterFn);
  const matches = (r: Row) => filterFns.every((fn) => fn(r));

  if (q.op === "insert" || q.op === "upsert") {
    const items = (Array.isArray(q.payload) ? q.payload : [q.payload]) as Row[];
    const inserted: Row[] = [];
    for (const item of items) {
      const row: Row = {
        ...(q.table === "group_links" ? {} : { id: item["id"] ?? crypto.randomUUID() }),
        created_at: item["created_at"] ?? new Date().toISOString(),
        ...item,
      };
      const existingIdx =
        q.op === "upsert"
          ? rows.findIndex((r) => {
              if (q.table === "group_links") return r["group_id"] === row["group_id"];
              if (q.table === "ratings" || q.table === "likes" || q.table === "watchlist") {
                return r["user_id"] === row["user_id"] && r["video_id"] === row["video_id"];
              }
              return r["id"] === row["id"];
            })
          : -1;
      if (existingIdx >= 0) {
        rows[existingIdx] = { ...rows[existingIdx], ...row };
        inserted.push(rows[existingIdx]!);
      } else {
        rows.push(row);
        inserted.push(row);
      }
    }
    saveStore(st);
    if (q.singleMode === "single" || q.singleMode === "maybeSingle") {
      return { data: inserted[0] ?? null, error: null };
    }
    return { data: inserted, error: null };
  }

  if (q.op === "update") {
    const patch = (q.payload ?? {}) as Row;
    const updated: Row[] = [];
    for (let i = 0; i < rows.length; i++) {
      if (matches(rows[i]!)) {
        rows[i] = { ...rows[i], ...patch };
        updated.push(rows[i]!);
      }
    }
    saveStore(st);
    if (q.singleMode === "single" || q.singleMode === "maybeSingle") {
      return { data: updated[0] ?? null, error: null };
    }
    return { data: updated, error: null };
  }

  if (q.op === "delete") {
    const kept: Row[] = [];
    const removed: Row[] = [];
    for (const r of rows) {
      if (matches(r)) removed.push(r);
      else kept.push(r);
    }
    st.db[q.table] = kept;
    saveStore(st);
    return { data: removed, error: null };
  }

  let result = rows
    .filter(matches)
    .map((r) => enrichRelations(st, q.table, r, q.selectExpr ?? "*"));
  for (const ord of [...(q.orders ?? [])].reverse()) {
    result.sort((a, b) => {
      const av = parseValue(a[ord.col]);
      const bv = parseValue(b[ord.col]);
      if (av === bv) return 0;
      const cmp = av < bv ? -1 : 1;
      return ord.ascending ? cmp : -cmp;
    });
  }
  const totalCount = result.length;
  if (typeof q.limitN === "number") result = result.slice(0, q.limitN);
  if (q.headMode) return { data: null, error: null, count: totalCount };
  if (q.singleMode === "single") {
    if (!result[0]) return { data: null, error: { message: "Haikupatikana" } };
    return { data: result[0], error: null };
  }
  if (q.singleMode === "maybeSingle") return { data: result[0] ?? null, error: null };
  return q.countMode
    ? { data: result, error: null, count: totalCount }
    : { data: result, error: null };
}

function runRpc(st: StoreState, r: LocalRpcPayload) {
  const uid = r.userId ?? null;
  const a = r.args;

  switch (r.fn) {
    case "has_role": {
      const targetUid = String(a["_user_id"] ?? uid ?? "");
      const role = String(a["_role"] ?? "admin");
      const found = (st.db["user_roles"] ?? []).some(
        (x) => x["user_id"] === targetUid && x["role"] === role,
      );
      return { data: found, error: null };
    }
    case "my_admin_sections": {
      const isAdmin = (st.db["user_roles"] ?? []).some(
        (x) => x["user_id"] === uid && x["role"] === "admin",
      );
      if (!isAdmin) return { data: [], error: null };
      const staff = (st.db["staff_permissions"] ?? []).find((s) => s["user_id"] === uid);
      return { data: staff ? (staff["sections"] as string[]) : null, error: null };
    }
    case "can_manage": {
      const targetUid = String(a["_uid"] ?? uid ?? "");
      const isAdmin = (st.db["user_roles"] ?? []).some(
        (x) => x["user_id"] === targetUid && x["role"] === "admin",
      );
      return { data: isAdmin, error: null };
    }
    case "payment_config_status": {
      const cfg = (st.db["payment_config"] ?? [])[0];
      const row = {
        key_configured: Boolean(cfg?.["api_key"]),
        secret_configured: Boolean(cfg?.["api_secret"]),
        enabled: Boolean(cfg?.["enabled"]),
      };
      return { data: r.singleMode ? row : [row], error: null };
    }
    case "record_view": {
      const vid = String(a["_video_id"] ?? "");
      const v = (st.db["videos"] ?? []).find((x) => x["id"] === vid);
      if (v) v["views"] = Number(v["views"] ?? 0) + 1;
      (st.db["video_views"] ?? []).push({
        id: crypto.randomUUID(),
        video_id: vid,
        user_id: uid,
        created_at: new Date().toISOString(),
      });
      saveStore(st);
      return { data: null, error: null };
    }
    case "create_payment": {
      const pkgId = String(a["_package_id"] ?? "");
      const phone = String(a["_phone"] ?? "");
      const pkg = (st.db["packages"] ?? []).find((p) => p["id"] === pkgId);
      const id = crypto.randomUUID();
      (st.db["payments"] ?? []).push({
        id,
        user_id: uid ?? DEMO_USER_ID,
        package_id: pkgId,
        group_id: null,
        package_name: pkg?.["name"] ?? "Kifurushi",
        duration_days: pkg?.["duration_days"] ?? 1,
        amount: pkg?.["price"] ?? 1000,
        phone,
        reference: "TV" + id.slice(0, 6).toUpperCase(),
        status: "pending",
        created_at: new Date().toISOString(),
      });
      saveStore(st);
      return { data: id, error: null };
    }
    case "finalize_payment":
    case "confirm_payment": {
      const pid = String(a["_payment_id"] ?? "");
      const approve = r.fn === "finalize_payment" ? true : Boolean(a["_approve"]);
      const p = (st.db["payments"] ?? []).find((x) => x["id"] === pid);
      if (p) {
        p["status"] = approve ? "paid" : "failed";
        p["confirmed_at"] = new Date().toISOString();
        if (approve) {
          if (p["group_id"]) {
            (st.db["group_memberships"] ?? []).push({
              id: crypto.randomUUID(),
              group_id: p["group_id"],
              user_id: p["user_id"],
              amount: p["amount"],
              phone: p["phone"],
              status: "paid",
              confirmed_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            });
          } else {
            const days = Math.max(1, Number(p["duration_days"] ?? 1));
            const userSubs = (st.db["subscriptions"] ?? []).filter(
              (s) => s["user_id"] === p["user_id"],
            );
            const latestMs = userSubs.reduce(
              (mx, s) => Math.max(mx, new Date(String(s["expires_at"] ?? 0)).getTime()),
              Date.now(),
            );
            (st.db["subscriptions"] ?? []).push({
              id: crypto.randomUUID(),
              user_id: p["user_id"],
              package_id: p["package_id"],
              source: "payment",
              starts_at: new Date().toISOString(),
              expires_at: new Date(latestMs + days * 86_400_000).toISOString(),
              created_at: new Date().toISOString(),
            });
            const refRow = (st.db["referrals"] ?? []).find(
              (rf) => rf["referred_id"] === p["user_id"] && !rf["rewarded"],
            );
            if (refRow) {
              const sRow = (st.db["site_settings"] ?? [])[0];
              const rewardDays = Math.max(1, Number(sRow?.["referral_reward_days"] ?? 1));
              const refSubs = (st.db["subscriptions"] ?? []).filter(
                (s) => s["user_id"] === refRow["referrer_id"],
              );
              const refLatest = refSubs.reduce(
                (mx, s) => Math.max(mx, new Date(String(s["expires_at"] ?? 0)).getTime()),
                Date.now(),
              );
              (st.db["subscriptions"] ?? []).push({
                id: crypto.randomUUID(),
                user_id: refRow["referrer_id"],
                package_id: null,
                source: "referral",
                starts_at: new Date().toISOString(),
                expires_at: new Date(refLatest + rewardDays * 86_400_000).toISOString(),
                created_at: new Date().toISOString(),
              });
              refRow["rewarded"] = true;
              refRow["rewarded_at"] = new Date().toISOString();
            }
          }
        }
        saveStore(st);
      }
      return { data: true, error: null };
    }
    case "confirm_group_payment": {
      const mid = String(a["_membership_id"] ?? "");
      const approve = Boolean(a["_approve"]);
      const m = (st.db["group_memberships"] ?? []).find((x) => x["id"] === mid);
      if (m) {
        m["status"] = approve ? "paid" : "rejected";
        m["confirmed_at"] = new Date().toISOString();
        saveStore(st);
      }
      return { data: null, error: null };
    }
    case "admin_reopen_payment": {
      const pid = String(a["_payment_id"] ?? "");
      const p = (st.db["payments"] ?? []).find((x) => x["id"] === pid);
      if (p) {
        p["status"] = "pending";
        saveStore(st);
      }
      return { data: null, error: null };
    }
    case "join_group": {
      const gid = String(a["_group_id"] ?? "");
      const id = crypto.randomUUID();
      (st.db["group_memberships"] ?? []).push({
        id,
        group_id: gid,
        user_id: uid ?? DEMO_USER_ID,
        amount: 0,
        phone: String(a["_phone"] ?? ""),
        status: "joined",
        confirmed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
      saveStore(st);
      return { data: id, error: null };
    }
    case "get_group_link": {
      const gid = String(a["_group_id"] ?? "");
      const l = (st.db["group_links"] ?? []).find((x) => x["group_id"] === gid);
      return { data: (l?.["join_link"] as string | undefined) ?? null, error: null };
    }
    case "admin_analytics": {
      const videos = (st.db["videos"] ?? []).slice(0, 5).map((v) => ({
        id: v["id"],
        title: v["title"],
        thumbnail_url: v["thumbnail_url"],
        views: Number(v["views"] ?? 0),
        period_views: Number(v["views"] ?? 0),
        viewers: Math.max(1, Math.floor(Number(v["views"] ?? 0) / 3)),
      }));
      const today = new Date().toISOString().slice(0, 10);
      return {
        data: {
          visits: (st.db["site_visits"] ?? []).length,
          visitors: Math.max(1, (st.db["site_visits"] ?? []).length),
          signed_in_visitors: (st.db["profiles"] ?? []).length,
          today_visitors: Math.max(1, (st.db["site_visits"] ?? []).length),
          online_now: 1,
          total_users: (st.db["profiles"] ?? []).length,
          new_users: (st.db["profiles"] ?? []).length,
          subscribed_users: (st.db["subscriptions"] ?? []).length,
          period_views: videos.reduce((s, v) => s + v.views, 0),
          all_views: videos.reduce((s, v) => s + v.views, 0),
          viewers: videos.reduce((s, v) => s + v.viewers, 0),
          daily: [
            {
              day: today,
              visits: Math.max(1, (st.db["site_visits"] ?? []).length),
              visitors: 1,
              views: 3,
            },
          ],
          pages: [{ path: "/", visits: 1 }],
          videos,
        },
        error: null,
      };
    }
    case "admin_video_stats": {
      const cats = new Map((st.db["categories"] ?? []).map((c) => [c["id"], c["name"]]));
      return {
        data: (st.db["videos"] ?? []).map((v) => ({
          id: v["id"],
          title: v["title"],
          kind: v["kind"],
          category: cats.get(v["category_id"]) ?? null,
          thumbnail_url: v["thumbnail_url"],
          views: Number(v["views"] ?? 0),
          plays_today: 0,
          plays_week: Number(v["views"] ?? 0),
          viewers: Math.max(0, Math.floor(Number(v["views"] ?? 0) / 3)),
          likes_count: Number(v["likes_count"] ?? 0),
          rating_avg: Number(v["rating_avg"] ?? 0),
          rating_count: Number(v["rating_count"] ?? 0),
        })),
        error: null,
      };
    }
    case "admin_list_staff": {
      const roles = (st.db["user_roles"] ?? []).filter((x) => x["role"] === "admin");
      const perms = new Map(
        (st.db["staff_permissions"] ?? []).map((s) => [s["user_id"], s["sections"] as string[]]),
      );
      return {
        data: roles.map((x) => {
          const p = (st.db["profiles"] ?? []).find((y) => y["id"] === x["user_id"]);
          const sections = perms.get(x["user_id"]);
          return {
            user_id: x["user_id"],
            full_name: p?.["full_name"] ?? "Admin",
            phone: p?.["phone"] ?? "",
            is_full: !sections,
            sections: sections ?? [],
          };
        }),
        error: null,
      };
    }
    case "admin_grant_days": {
      const targetUid = String(a["_user_id"] ?? "");
      const days = Number(a["_days"] ?? 1);
      const id = crypto.randomUUID();
      (st.db["subscriptions"] ?? []).push({
        id,
        user_id: targetUid,
        package_id: null,
        source: "admin",
        starts_at: new Date().toISOString(),
        expires_at: aheadIso(days),
        created_at: new Date().toISOString(),
      });
      saveStore(st);
      return { data: id, error: null };
    }
    case "admin_grant_days_all": {
      const days = Number(a["_days"] ?? 1);
      const profiles = st.db["profiles"] ?? [];
      for (const p of profiles) {
        (st.db["subscriptions"] ?? []).push({
          id: crypto.randomUUID(),
          user_id: p["id"],
          package_id: null,
          source: "offer",
          starts_at: new Date().toISOString(),
          expires_at: aheadIso(days),
          created_at: new Date().toISOString(),
        });
      }
      saveStore(st);
      return { data: profiles.length, error: null };
    }
    case "admin_end_access": {
      const targetUid = String(a["_user_id"] ?? "");
      st.db["subscriptions"] = (st.db["subscriptions"] ?? []).filter(
        (s) => s["user_id"] !== targetUid,
      );
      saveStore(st);
      return { data: null, error: null };
    }
    case "admin_revoke_offer": {
      const targetUid = String(a["_user_id"] ?? "");
      st.db["subscriptions"] = (st.db["subscriptions"] ?? []).filter(
        (s) =>
          !(s["user_id"] === targetUid && (s["source"] === "offer" || s["source"] === "admin")),
      );
      saveStore(st);
      return { data: null, error: null };
    }
    case "admin_revoke_offers_all": {
      const before = (st.db["subscriptions"] ?? []).length;
      st.db["subscriptions"] = (st.db["subscriptions"] ?? []).filter(
        (s) => s["source"] !== "offer" && s["source"] !== "admin",
      );
      saveStore(st);
      return { data: before - st.db["subscriptions"].length, error: null };
    }
    case "admin_set_full_staff": {
      const targetUid = String(a["_user_id"] ?? "");
      if (
        !(st.db["user_roles"] ?? []).some(
          (x) => x["user_id"] === targetUid && x["role"] === "admin",
        )
      ) {
        (st.db["user_roles"] ?? []).push({
          id: crypto.randomUUID(),
          user_id: targetUid,
          role: "admin",
        });
      }
      st.db["staff_permissions"] = (st.db["staff_permissions"] ?? []).filter(
        (s) => s["user_id"] !== targetUid,
      );
      saveStore(st);
      return { data: null, error: null };
    }
    case "admin_set_staff": {
      const targetUid = String(a["_user_id"] ?? "");
      if (
        !(st.db["user_roles"] ?? []).some(
          (x) => x["user_id"] === targetUid && x["role"] === "admin",
        )
      ) {
        (st.db["user_roles"] ?? []).push({
          id: crypto.randomUUID(),
          user_id: targetUid,
          role: "admin",
        });
      }
      st.db["staff_permissions"] = (st.db["staff_permissions"] ?? []).filter(
        (s) => s["user_id"] !== targetUid,
      );
      (st.db["staff_permissions"] ?? []).push({
        user_id: targetUid,
        sections: a["_sections"] ?? [],
        created_at: new Date().toISOString(),
      });
      saveStore(st);
      return { data: null, error: null };
    }
    case "admin_remove_staff": {
      const targetUid = String(a["_user_id"] ?? "");
      st.db["user_roles"] = (st.db["user_roles"] ?? []).filter((x) => x["user_id"] !== targetUid);
      st.db["staff_permissions"] = (st.db["staff_permissions"] ?? []).filter(
        (s) => s["user_id"] !== targetUid,
      );
      saveStore(st);
      return { data: null, error: null };
    }
    case "admin_clean_data": {
      const scope = String(a["_scope"] ?? "");
      if (scope === "failed_payments") {
        const prev = (st.db["payments"] ?? []).length;
        st.db["payments"] = (st.db["payments"] ?? []).filter((p) => p["status"] !== "failed");
        saveStore(st);
        return { data: prev - st.db["payments"].length, error: null };
      }
      if (scope === "watch_history") {
        const prev = (st.db["watch_progress"] ?? []).length;
        st.db["watch_progress"] = [];
        saveStore(st);
        return { data: prev, error: null };
      }
      if (scope === "visits") {
        const prev = (st.db["site_visits"] ?? []).length;
        st.db["site_visits"] = [];
        saveStore(st);
        return { data: prev, error: null };
      }
      return { data: 0, error: null };
    }
    case "purge_deleted_account_details": {
      const targetUid = String(a["_uid"] ?? "");
      for (const tbl of [
        "profiles",
        "watchlist",
        "likes",
        "watch_progress",
        "ratings",
        "group_memberships",
        "access_tokens",
      ]) {
        st.db[tbl] = (st.db[tbl] ?? []).filter(
          (x) => x["id"] !== targetUid && x["user_id"] !== targetUid,
        );
      }
      saveStore(st);
      return { data: null, error: null };
    }
    default:
      return { data: null, error: null };
  }
}

function runAuth(st: StoreState, a: LocalAuthPayload) {
  switch (a.action) {
    case "signUp": {
      const email = a.email ?? "";
      const existing = st.accounts.find((x) => x.email === email);
      if (existing)
        return {
          data: { user: null, session: null },
          error: { message: "User already registered" },
        };
      const id = crypto.randomUUID();
      const phone = a.options?.data?.phone ?? email.split("@")[0] ?? "";
      const fullName = a.options?.data?.full_name ?? "Mtumiaji";
      const acc: MockAuthAccount = {
        id,
        email,
        password: a.password ?? "",
        phone,
        full_name: fullName,
      };
      st.accounts.push(acc);
      (st.db["profiles"] ?? []).push({
        id,
        full_name: fullName,
        phone,
        avatar_url: null,
        referral_code: id.slice(0, 6).toUpperCase(),
        is_verified: false,
        is_blocked: false,
        notify_new_videos: true,
        notify_new_episodes: true,
        notify_expiry: true,
        notifications_seen_at: new Date().toISOString(),
        channel_followed_at: null,
        channel_invite_dismissed_at: null,
        created_at: new Date().toISOString(),
      });
      const refCode = String(a.options?.data?.referral_code ?? "")
        .trim()
        .toUpperCase();
      if (refCode) {
        const referrer = (st.db["profiles"] ?? []).find(
          (pr) => String(pr["referral_code"] ?? "").toUpperCase() === refCode && pr["id"] !== id,
        );
        if (referrer) {
          const nowMs = Date.now();
          (st.db["referrals"] ?? []).push({
            id: crypto.randomUUID(),
            referrer_id: referrer["id"],
            referred_id: id,
            rewarded: false,
            rewarded_at: null,
            created_at: new Date(nowMs).toISOString(),
          });
          (st.db["subscriptions"] ?? []).push({
            id: crypto.randomUUID(),
            user_id: id,
            package_id: null,
            source: "welcome",
            starts_at: new Date(nowMs).toISOString(),
            expires_at: new Date(nowMs + 20 * 60_000).toISOString(),
            created_at: new Date(nowMs).toISOString(),
          });
        }
      }
      saveStore(st);
      const session = buildSession(acc);
      return { data: { user: session.user, session }, error: null };
    }
    case "signInWithPassword": {
      const acc = st.accounts.find((x) => x.email === a.email && x.password === a.password);
      if (!acc)
        return {
          data: { user: null, session: null },
          error: { message: "Invalid login credentials" },
        };
      const session = buildSession(acc);
      return { data: { user: session.user, session }, error: null };
    }
    case "getUser": {
      const acc = st.accounts.find((x) => x.id === a.userId);
      const session = acc ? buildSession(acc) : null;
      return { data: { user: session?.user ?? null }, error: null };
    }
    case "getClaims": {
      const uid = a.token?.startsWith("mock.") ? a.token.split(".")[1] : (a.userId ?? undefined);
      if (!uid) return { data: null, error: { message: "Unauthorized" } };
      const acc = st.accounts.find((x) => x.id === uid);
      if (!acc) return { data: null, error: { message: "Unauthorized" } };
      return { data: { claims: { sub: acc.id, email: acc.email } }, error: null };
    }
    case "updatePassword": {
      const acc = st.accounts.find((x) => x.id === a.userId);
      if (!acc) return { data: { user: null }, error: { message: "Akaunti haikupatikana" } };
      if (!a.password || a.password.length < 6) {
        return {
          data: { user: null },
          error: { message: "Nenosiri jipya liwe na herufi 6 au zaidi" },
        };
      }
      acc.password = a.password;
      saveStore(st);
      const session = buildSession(acc);
      return { data: { user: session.user }, error: null };
    }
    case "deleteUser": {
      st.accounts = st.accounts.filter((x) => x.id !== a.userId);
      saveStore(st);
      return { data: {}, error: null };
    }
  }
}

export async function executeLocalSupabaseOperation(payload: LocalExecPayload): Promise<unknown> {
  const st = loadStore();
  if (payload.kind === "query") return runQuery(st, payload);
  if (payload.kind === "rpc") return runRpc(st, payload);
  return runAuth(st, payload);
}

g.__TRANDING_LOCAL_EXEC__ = executeLocalSupabaseOperation;

function safeMediaPath(bucket: string, relPath: string): string | null {
  const cleanBucket = bucket.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!cleanBucket) return null;
  const resolved = path.resolve(MEDIA_ROOT, cleanBucket, relPath.replace(/^\/+/, ""));
  const base = path.resolve(MEDIA_ROOT, cleanBucket);
  if (!resolved.startsWith(base + path.sep) && resolved !== base) return null;
  return resolved;
}

const MIME_BY_EXT: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".m4v": "video/mp4",
  ".vtt": "text/vtt; charset=utf-8",
  ".srt": "text/plain; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

export async function handleLocalSupabasePost(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as LocalExecPayload;
    const result = await executeLocalSupabaseOperation(body);
    return Response.json(result);
  } catch (err) {
    return Response.json(
      { data: null, error: { message: err instanceof Error ? err.message : "Bad request" } },
      { status: 400 },
    );
  }
}

export async function handleLocalMediaUploadPost(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const bucket = url.searchParams.get("bucket") || "media";
  const relPath = url.searchParams.get("path") || `${Date.now()}.bin`;
  const filePath = safeMediaPath(bucket, relPath);
  if (!filePath) return Response.json({ error: "Invalid path" }, { status: 400 });
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const bytes = new Uint8Array(await request.arrayBuffer());
  fs.writeFileSync(filePath, bytes);
  const cleanBucket = bucket.replace(/[^a-zA-Z0-9_-]/g, "");
  const cleanRel = relPath.replace(/^\/+/, "");
  return Response.json({ url: `/api/local-media/${cleanBucket}/${cleanRel}` });
}

export async function handleLocalMediaServe(request: Request, splat: string): Promise<Response> {
  const rest = splat.replace(/^\/+/, "");
  const slash = rest.indexOf("/");
  if (slash <= 0) return new Response("Not Found", { status: 404 });
  const bucket = rest.slice(0, slash);
  const relPath = decodeURIComponent(rest.slice(slash + 1));
  const filePath = safeMediaPath(bucket, relPath);
  if (!filePath || !fs.existsSync(filePath)) return new Response("Not Found", { status: 404 });

  const stat = fs.statSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_BY_EXT[ext] ?? "application/octet-stream";
  const rangeHeader = request.headers.get("range");

  if (rangeHeader && rangeHeader.startsWith("bytes=")) {
    const [startStr, endStr] = rangeHeader.replace("bytes=", "").split("-");
    const start = startStr ? Math.max(0, Number(startStr)) : 0;
    const end = endStr ? Math.min(stat.size - 1, Number(endStr)) : stat.size - 1;
    if (isNaN(start) || isNaN(end) || start > end || start >= stat.size) {
      return new Response("Range Not Satisfiable", {
        status: 416,
        headers: { "Content-Range": `bytes */${stat.size}` },
      });
    }
    const chunkSize = end - start + 1;
    const buf = Buffer.alloc(chunkSize);
    const fd = fs.openSync(filePath, "r");
    try {
      fs.readSync(fd, buf, 0, chunkSize, start);
    } finally {
      fs.closeSync(fd);
    }
    return new Response(request.method === "HEAD" ? null : buf, {
      status: 206,
      headers: {
        "Content-Type": contentType,
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunkSize),
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  const body = request.method === "HEAD" ? null : fs.readFileSync(filePath);
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(stat.size),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export async function handleLocalApiRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname === "/api/local-supabase" && request.method === "POST") {
    return handleLocalSupabasePost(request);
  }
  if (
    (url.pathname === "/api/local-media-upload" || url.pathname === "/api/local-media") &&
    request.method === "POST"
  ) {
    return handleLocalMediaUploadPost(request);
  }
  if (
    url.pathname.startsWith("/api/local-media/") &&
    (request.method === "GET" || request.method === "HEAD")
  ) {
    return handleLocalMediaServe(request, url.pathname.slice("/api/local-media/".length));
  }
  return null;
}
