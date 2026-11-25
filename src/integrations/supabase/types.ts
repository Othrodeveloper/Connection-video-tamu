export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          sort: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          sort?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          sort?: number;
        };
        Relationships: [];
      };
      episodes: {
        Row: {
          created_at: string;
          description: string;
          duration_minutes: number | null;
          id: string;
          number: number;
          season_id: string;
          thumbnail_url: string | null;
          title: string;
          video_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string;
          duration_minutes?: number | null;
          id?: string;
          number: number;
          season_id: string;
          thumbnail_url?: string | null;
          title: string;
          video_id: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          duration_minutes?: number | null;
          id?: string;
          number?: number;
          season_id?: string;
          thumbnail_url?: string | null;
          title?: string;
          video_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "episodes_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "episodes_video_id_fkey";
            columns: ["video_id"];
            isOneToOne: false;
            referencedRelation: "videos";
            referencedColumns: ["id"];
          },
        ];
      };
      group_links: {
        Row: {
          group_id: string;
          join_link: string;
        };
        Insert: {
          group_id: string;
          join_link: string;
        };
        Update: {
          group_id?: string;
          join_link?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_links_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: true;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      group_memberships: {
        Row: {
          amount: number;
          confirmed_at: string | null;
          created_at: string;
          group_id: string;
          id: string;
          phone: string | null;
          status: string;
          user_id: string;
        };
        Insert: {
          amount?: number;
          confirmed_at?: string | null;
          created_at?: string;
          group_id: string;
          id?: string;
          phone?: string | null;
          status?: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          confirmed_at?: string | null;
          created_at?: string;
          group_id?: string;
          id?: string;
          phone?: string | null;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_memberships_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      group_slides: {
        Row: {
          id: string;
          image_url: string;
          sort: number;
          title: string;
        };
        Insert: {
          id?: string;
          image_url: string;
          sort?: number;
          title?: string;
        };
        Update: {
          id?: string;
          image_url?: string;
          sort?: number;
          title?: string;
        };
        Relationships: [];
      };
      groups: {
        Row: {
          category: string;
          created_at: string;
          description: string;
          id: string;
          image_url: string | null;
          is_active: boolean;
          is_paid: boolean;
          members_count: number;
          name: string;
          price: number;
          sort: number;
        };
        Insert: {
          category?: string;
          created_at?: string;
          description?: string;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          is_paid?: boolean;
          members_count?: number;
          name: string;
          price?: number;
          sort?: number;
        };
        Update: {
          category?: string;
          created_at?: string;
          description?: string;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          is_paid?: boolean;
          members_count?: number;
          name?: string;
          price?: number;
          sort?: number;
        };
        Relationships: [];
      };
      likes: {
        Row: {
          created_at: string;
          user_id: string;
          video_id: string;
        };
        Insert: {
          created_at?: string;
          user_id: string;
          video_id: string;
        };
        Update: {
          created_at?: string;
          user_id?: string;
          video_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "likes_video_id_fkey";
            columns: ["video_id"];
            isOneToOne: false;
            referencedRelation: "videos";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          kind: string;
          title: string;
          video_id: string | null;
        };
        Insert: {
          body?: string;
          created_at?: string;
          id?: string;
          kind?: string;
          title: string;
          video_id?: string | null;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          kind?: string;
          title?: string;
          video_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_video_id_fkey";
            columns: ["video_id"];
            isOneToOne: false;
            referencedRelation: "videos";
            referencedColumns: ["id"];
          },
        ];
      };
      packages: {
        Row: {
          created_at: string;
          description: string;
          duration_days: number;
          id: string;
          is_active: boolean;
          name: string;
          price: number;
          sort: number;
        };
        Insert: {
          created_at?: string;
          description?: string;
          duration_days: number;
          id?: string;
          is_active?: boolean;
          name: string;
          price: number;
          sort?: number;
        };
        Update: {
          created_at?: string;
          description?: string;
          duration_days?: number;
          id?: string;
          is_active?: boolean;
          name?: string;
          price?: number;
          sort?: number;
        };
        Relationships: [];
      };
      payment_config: {
        Row: {
          api_key: string;
          api_secret: string;
          base_url: string;
          enabled: boolean;
          id: number;
          provider: string;
          test_request_id: number | null;
          test_swapped: boolean;
          updated_at: string;
        };
        Insert: {
          api_key?: string;
          api_secret?: string;
          base_url?: string;
          enabled?: boolean;
          id?: number;
          provider?: string;
          test_request_id?: number | null;
          test_swapped?: boolean;
          updated_at?: string;
        };
        Update: {
          api_key?: string;
          api_secret?: string;
          base_url?: string;
          enabled?: boolean;
          id?: number;
          provider?: string;
          test_request_id?: number | null;
          test_swapped?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          amount: number;
          channel: string | null;
          confirmed_at: string | null;
          created_at: string;
          duration_days: number;
          group_id: string | null;
          id: string;
          order_id: string | null;
          package_id: string | null;
          package_name: string;
          phone: string;
          provider_message: string | null;
          provider_status: string | null;
          reference: string | null;
          sonic_request_id: number | null;
          sonic_request_kind: string | null;
          status: string;
          transid: string | null;
          user_id: string;
        };
        Insert: {
          amount: number;
          channel?: string | null;
          confirmed_at?: string | null;
          created_at?: string;
          duration_days: number;
          group_id?: string | null;
          id?: string;
          order_id?: string | null;
          package_id?: string | null;
          package_name: string;
          phone: string;
          provider_message?: string | null;
          provider_status?: string | null;
          reference?: string | null;
          sonic_request_id?: number | null;
          sonic_request_kind?: string | null;
          status?: string;
          transid?: string | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          channel?: string | null;
          confirmed_at?: string | null;
          created_at?: string;
          duration_days?: number;
          group_id?: string | null;
          id?: string;
          order_id?: string | null;
          package_id?: string | null;
          package_name?: string;
          phone?: string;
          provider_message?: string | null;
          provider_status?: string | null;
          reference?: string | null;
          sonic_request_id?: number | null;
          sonic_request_kind?: string | null;
          status?: string;
          transid?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_package_id_fkey";
            columns: ["package_id"];
            isOneToOne: false;
            referencedRelation: "packages";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          channel_followed_at: string | null;
          channel_invite_dismissed_at: string | null;
          created_at: string;
          full_name: string;
          id: string;
          is_blocked: boolean;
          is_verified: boolean;
          notifications_seen_at: string;
          notify_expiry: boolean;
          notify_new_episodes: boolean;
          notify_new_videos: boolean;
          phone: string | null;
          referral_code: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          channel_followed_at?: string | null;
          channel_invite_dismissed_at?: string | null;
          created_at?: string;
          full_name?: string;
          id: string;
          is_blocked?: boolean;
          is_verified?: boolean;
          notifications_seen_at?: string;
          notify_expiry?: boolean;
          notify_new_episodes?: boolean;
          notify_new_videos?: boolean;
          phone?: string | null;
          referral_code?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          channel_followed_at?: string | null;
          channel_invite_dismissed_at?: string | null;
          created_at?: string;
          full_name?: string;
          id?: string;
          is_blocked?: boolean;
          is_verified?: boolean;
          notifications_seen_at?: string;
          notify_expiry?: boolean;
          notify_new_episodes?: boolean;
          notify_new_videos?: boolean;
          phone?: string | null;
          referral_code?: string | null;
        };
        Relationships: [];
      };
      ratings: {
        Row: {
          created_at: string;
          stars: number;
          user_id: string;
          video_id: string;
        };
        Insert: {
          created_at?: string;
          stars: number;
          user_id: string;
          video_id: string;
        };
        Update: {
          created_at?: string;
          stars?: number;
          user_id?: string;
          video_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ratings_video_id_fkey";
            columns: ["video_id"];
            isOneToOne: false;
            referencedRelation: "videos";
            referencedColumns: ["id"];
          },
        ];
      };
      referrals: {
        Row: {
          created_at: string;
          id: string;
          referred_id: string;
          referrer_id: string;
          rewarded: boolean;
          rewarded_at: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          referred_id: string;
          referrer_id: string;
          rewarded?: boolean;
          rewarded_at?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          referred_id?: string;
          referrer_id?: string;
          rewarded?: boolean;
          rewarded_at?: string | null;
        };
        Relationships: [];
      };
      seasons: {
        Row: {
          id: string;
          number: number;
          title: string | null;
          video_id: string;
        };
        Insert: {
          id?: string;
          number: number;
          title?: string | null;
          video_id: string;
        };
        Update: {
          id?: string;
          number?: number;
          title?: string | null;
          video_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seasons_video_id_fkey";
            columns: ["video_id"];
            isOneToOne: false;
            referencedRelation: "videos";
            referencedColumns: ["id"];
          },
        ];
      };
      server_access_keys: {
        Row: {
          id: number;
          key_hash: string;
        };
        Insert: {
          id?: number;
          key_hash: string;
        };
        Update: {
          id?: number;
          key_hash?: string;
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          content: Json;
          id: number;
          intro_video_url: string | null;
          logo_url: string | null;
          payment_instructions: string | null;
          paywall_delay_seconds: number;
          referral_reward_days: number;
          site_name: string;
          support_email: string | null;
          support_facebook: string | null;
          support_hours: string | null;
          support_instagram: string | null;
          support_message: string | null;
          support_phone: string | null;
          support_telegram: string | null;
          support_tiktok: string | null;
          support_whatsapp: string | null;
          texts: Json;
          trial_seconds: number;
          updated_at: string;
          welcome_minutes: number;
        };
        Insert: {
          content?: Json;
          id?: number;
          intro_video_url?: string | null;
          logo_url?: string | null;
          payment_instructions?: string | null;
          paywall_delay_seconds?: number;
          referral_reward_days?: number;
          site_name?: string;
          support_email?: string | null;
          support_facebook?: string | null;
          support_hours?: string | null;
          support_instagram?: string | null;
          support_message?: string | null;
          support_phone?: string | null;
          support_telegram?: string | null;
          support_tiktok?: string | null;
          support_whatsapp?: string | null;
          texts?: Json;
          trial_seconds?: number;
          updated_at?: string;
          welcome_minutes?: number;
        };
        Update: {
          content?: Json;
          id?: number;
          intro_video_url?: string | null;
          logo_url?: string | null;
          payment_instructions?: string | null;
          paywall_delay_seconds?: number;
          referral_reward_days?: number;
          site_name?: string;
          support_email?: string | null;
          support_facebook?: string | null;
          support_hours?: string | null;
          support_instagram?: string | null;
          support_message?: string | null;
          support_phone?: string | null;
          support_telegram?: string | null;
          support_tiktok?: string | null;
          support_whatsapp?: string | null;
          texts?: Json;
          trial_seconds?: number;
          updated_at?: string;
          welcome_minutes?: number;
        };
        Relationships: [];
      };
      site_visits: {
        Row: {
          created_at: string;
          id: string;
          path: string;
          user_id: string | null;
          visitor_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          path?: string;
          user_id?: string | null;
          visitor_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          path?: string;
          user_id?: string | null;
          visitor_id?: string;
        };
        Relationships: [];
      };
      staff_permissions: {
        Row: {
          created_at: string;
          sections: string[];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          sections?: string[];
          user_id: string;
        };
        Update: {
          created_at?: string;
          sections?: string[];
          user_id?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          created_at: string;
          expires_at: string;
          id: string;
          package_id: string | null;
          source: string;
          starts_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          expires_at: string;
          id?: string;
          package_id?: string | null;
          source?: string;
          starts_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          package_id?: string | null;
          source?: string;
          starts_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_package_id_fkey";
            columns: ["package_id"];
            isOneToOne: false;
            referencedRelation: "packages";
            referencedColumns: ["id"];
          },
        ];
      };
      trial_passes: {
        Row: {
          created_at: string;
          expires_at: string;
          id: string;
          object_path: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          expires_at: string;
          id?: string;
          object_path: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          object_path?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      video_files: {
        Row: {
          created_at: string;
          episode_id: string | null;
          id: string;
          quality: string;
          subtitle_label: string | null;
          subtitle_url: string | null;
          url: string;
          video_id: string;
        };
        Insert: {
          created_at?: string;
          episode_id?: string | null;
          id?: string;
          quality?: string;
          subtitle_label?: string | null;
          subtitle_url?: string | null;
          url: string;
          video_id: string;
        };
        Update: {
          created_at?: string;
          episode_id?: string | null;
          id?: string;
          quality?: string;
          subtitle_label?: string | null;
          subtitle_url?: string | null;
          url?: string;
          video_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "video_files_episode_id_fkey";
            columns: ["episode_id"];
            isOneToOne: false;
            referencedRelation: "episodes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "video_files_video_id_fkey";
            columns: ["video_id"];
            isOneToOne: false;
            referencedRelation: "videos";
            referencedColumns: ["id"];
          },
        ];
      };
      video_views: {
        Row: {
          created_at: string;
          id: string;
          user_id: string | null;
          video_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          user_id?: string | null;
          video_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          user_id?: string | null;
          video_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "video_views_video_id_fkey";
            columns: ["video_id"];
            isOneToOne: false;
            referencedRelation: "videos";
            referencedColumns: ["id"];
          },
        ];
      };
      videos: {
        Row: {
          banner_url: string | null;
          category_id: string | null;
          created_at: string;
          description: string;
          duration_minutes: number | null;
          id: string;
          is_coming_soon: boolean;
          is_featured: boolean;
          is_published: boolean;
          kind: string;
          likes_count: number;
          publish_at: string;
          rating_avg: number;
          rating_count: number;
          thumbnail_url: string | null;
          title: string;
          trailer_url: string | null;
          updated_at: string;
          views: number;
          year: number | null;
        };
        Insert: {
          banner_url?: string | null;
          category_id?: string | null;
          created_at?: string;
          description?: string;
          duration_minutes?: number | null;
          id?: string;
          is_coming_soon?: boolean;
          is_featured?: boolean;
          is_published?: boolean;
          kind?: string;
          likes_count?: number;
          publish_at?: string;
          rating_avg?: number;
          rating_count?: number;
          thumbnail_url?: string | null;
          title: string;
          trailer_url?: string | null;
          updated_at?: string;
          views?: number;
          year?: number | null;
        };
        Update: {
          banner_url?: string | null;
          category_id?: string | null;
          created_at?: string;
          description?: string;
          duration_minutes?: number | null;
          id?: string;
          is_coming_soon?: boolean;
          is_featured?: boolean;
          is_published?: boolean;
          kind?: string;
          likes_count?: number;
          publish_at?: string;
          rating_avg?: number;
          rating_count?: number;
          thumbnail_url?: string | null;
          title?: string;
          trailer_url?: string | null;
          updated_at?: string;
          views?: number;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "videos_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      watch_progress: {
        Row: {
          duration_seconds: number;
          episode_id: string | null;
          id: string;
          position_seconds: number;
          updated_at: string;
          user_id: string;
          video_id: string;
        };
        Insert: {
          duration_seconds?: number;
          episode_id?: string | null;
          id?: string;
          position_seconds?: number;
          updated_at?: string;
          user_id: string;
          video_id: string;
        };
        Update: {
          duration_seconds?: number;
          episode_id?: string | null;
          id?: string;
          position_seconds?: number;
          updated_at?: string;
          user_id?: string;
          video_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "watch_progress_episode_id_fkey";
            columns: ["episode_id"];
            isOneToOne: false;
            referencedRelation: "episodes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "watch_progress_video_id_fkey";
            columns: ["video_id"];
            isOneToOne: false;
            referencedRelation: "videos";
            referencedColumns: ["id"];
          },
        ];
      };
      watchlist: {
        Row: {
          created_at: string;
          user_id: string;
          video_id: string;
        };
        Insert: {
          created_at?: string;
          user_id: string;
          video_id: string;
        };
        Update: {
          created_at?: string;
          user_id?: string;
          video_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "watchlist_video_id_fkey";
            columns: ["video_id"];
            isOneToOne: false;
            referencedRelation: "videos";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      _grant_days: {
        Args: {
          _days: number;
          _package_id: string;
          _source: string;
          _user_id: string;
        };
        Returns: string;
      };
      _sonic_auth_bad: {
        Args: { _json: Json; _status: number };
        Returns: boolean;
      };
      _sonic_result: { Args: { _request_id: number }; Returns: Json };
      _sonic_send: {
        Args: { _body: Json; _path: string; _swapped: boolean };
        Returns: number;
      };
      _swap_payment_keys: { Args: never; Returns: undefined };
      admin_analytics: { Args: { _days?: number }; Returns: Json };
      admin_clean_data: {
        Args: { _confirmation: string; _scope: string };
        Returns: number;
      };
      admin_end_access: { Args: { _user_id: string }; Returns: undefined };
      admin_grant_days: {
        Args: { _days: number; _user_id: string };
        Returns: string;
      };
      admin_grant_days_all: { Args: { _days: number }; Returns: number };
      admin_list_staff: {
        Args: never;
        Returns: {
          full_name: string;
          is_full: boolean;
          phone: string;
          sections: string[];
          user_id: string;
        }[];
      };
      admin_remove_staff: { Args: { _user_id: string }; Returns: undefined };
      admin_reopen_payment: {
        Args: { _payment_id: string };
        Returns: undefined;
      };
      admin_revoke_offer: { Args: { _user_id: string }; Returns: undefined };
      admin_revoke_offers_all: { Args: never; Returns: number };
      admin_set_full_staff: { Args: { _user_id: string }; Returns: undefined };
      admin_set_staff: {
        Args: { _sections: string[]; _user_id: string };
        Returns: undefined;
      };
      admin_video_stats: {
        Args: never;
        Returns: {
          category: string;
          id: string;
          kind: string;
          likes_count: number;
          plays_today: number;
          plays_week: number;
          rating_avg: number;
          rating_count: number;
          thumbnail_url: string;
          title: string;
          viewers: number;
          views: number;
        }[];
      };
      can_manage: { Args: { _section: string; _uid: string }; Returns: boolean };
      confirm_group_payment: {
        Args: { _approve: boolean; _membership_id: string };
        Returns: undefined;
      };
      confirm_payment: {
        Args: { _approve: boolean; _payment_id: string };
        Returns: undefined;
      };
      create_payment: {
        Args: { _package_id: string; _phone: string };
        Returns: string;
      };
      finalize_payment: { Args: { _payment_id: string }; Returns: boolean };
      get_group_link: { Args: { _group_id: string }; Returns: string };
      has_active_subscription: { Args: { _user_id: string }; Returns: boolean };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      has_trial_pass: {
        Args: { _path: string; _uid: string };
        Returns: boolean;
      };
      join_group: {
        Args: { _group_id: string; _phone: string };
        Returns: string;
      };
      my_admin_sections: { Args: never; Returns: string[] };
      pay_check: { Args: { _payment_id: string }; Returns: Json };
      pay_start: {
        Args: {
          _group_id: string;
          _name: string;
          _package_id: string;
          _phone: string;
        };
        Returns: Json;
      };
      pay_test_connection: { Args: never; Returns: Json };
      pay_test_result: { Args: never; Returns: Json };
      payment_config_status: {
        Args: never;
        Returns: {
          enabled: boolean;
          key_configured: boolean;
          secret_configured: boolean;
        }[];
      };
      purge_deleted_account_details: {
        Args: { _uid: string };
        Returns: undefined;
      };
      record_view: { Args: { _video_id: string }; Returns: undefined };
      save_payment_config: {
        Args: { _api_key: string; _api_secret: string; _enabled: boolean };
        Returns: undefined;
      };
      trial_file: {
        Args: { _episode_id: string; _video_id: string };
        Returns: string;
      };
    };
    Enums: {
      app_role: "admin" | "user";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const;
