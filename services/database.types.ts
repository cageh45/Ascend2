export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      friend_requests: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          responded_at: string | null
          sender_id: string
          status: Database["public"]["Enums"]["friend_request_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          responded_at?: string | null
          sender_id: string
          status?: Database["public"]["Enums"]["friend_request_status"]
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          responded_at?: string | null
          sender_id?: string
          status?: Database["public"]["Enums"]["friend_request_status"]
        }
        Relationships: [
          {
            foreignKeyName: "friend_requests_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "party_roster"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_requests_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "party_roster"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string
          user_high: string
          user_low: string
        }
        Insert: {
          created_at?: string
          user_high: string
          user_low: string
        }
        Update: {
          created_at?: string
          user_high?: string
          user_low?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_user_high_fkey"
            columns: ["user_high"]
            isOneToOne: false
            referencedRelation: "party_roster"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_high_fkey"
            columns: ["user_high"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_low_fkey"
            columns: ["user_low"]
            isOneToOne: false
            referencedRelation: "party_roster"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_low_fkey"
            columns: ["user_low"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parties: {
        Row: {
          created_at: string
          id: string
          invite_code: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "party_roster"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      party_invites: {
        Row: {
          created_at: string
          id: string
          invited_by: string
          invited_user_id: string
          party_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["party_invite_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by: string
          invited_user_id: string
          party_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["party_invite_status"]
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string
          invited_user_id?: string
          party_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["party_invite_status"]
        }
        Relationships: [
          {
            foreignKeyName: "party_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "party_roster"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_invites_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "party_roster"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_invites_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_invites_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      party_members: {
        Row: {
          joined_at: string
          party_id: string
          role: Database["public"]["Enums"]["party_role"]
          user_id: string
        }
        Insert: {
          joined_at?: string
          party_id: string
          role?: Database["public"]["Enums"]["party_role"]
          user_id: string
        }
        Update: {
          joined_at?: string
          party_id?: string
          role?: Database["public"]["Enums"]["party_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_members_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "party_roster"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      party_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          party_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          party_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          party_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_messages_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "party_roster"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          appearance_id: string
          character_class: string
          created_at: string
          display_name: string
          handle: string
          id: string
          last_seen_at: string
          level: number
          raid_contribution: number
          status: string
          updated_at: string
          weekly_xp: number
        }
        Insert: {
          appearance_id?: string
          character_class?: string
          created_at?: string
          display_name?: string
          handle: string
          id: string
          last_seen_at?: string
          level?: number
          raid_contribution?: number
          status?: string
          updated_at?: string
          weekly_xp?: number
        }
        Update: {
          appearance_id?: string
          character_class?: string
          created_at?: string
          display_name?: string
          handle?: string
          id?: string
          last_seen_at?: string
          level?: number
          raid_contribution?: number
          status?: string
          updated_at?: string
          weekly_xp?: number
        }
        Relationships: []
      }
      raid_participants: {
        Row: {
          connected: boolean
          damage: number
          last_seen_at: string
          raid_session_id: string
          ready: boolean
          reported_outcome: string | null
          user_id: string
        }
        Insert: {
          connected?: boolean
          damage?: number
          last_seen_at?: string
          raid_session_id: string
          ready?: boolean
          reported_outcome?: string | null
          user_id: string
        }
        Update: {
          connected?: boolean
          damage?: number
          last_seen_at?: string
          raid_session_id?: string
          ready?: boolean
          reported_outcome?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "raid_participants_raid_session_id_fkey"
            columns: ["raid_session_id"]
            isOneToOne: false
            referencedRelation: "raid_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raid_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "party_roster"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raid_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      raid_reward_claims: {
        Row: {
          claimed_at: string
          raid_session_id: string
          reward_xp: number
          user_id: string
        }
        Insert: {
          claimed_at?: string
          raid_session_id: string
          reward_xp: number
          user_id: string
        }
        Update: {
          claimed_at?: string
          raid_session_id?: string
          reward_xp?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "raid_reward_claims_raid_session_id_fkey"
            columns: ["raid_session_id"]
            isOneToOne: false
            referencedRelation: "raid_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raid_reward_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "party_roster"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raid_reward_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      raid_sessions: {
        Row: {
          boss_hp: number
          boss_max_hp: number
          completed_at: string | null
          created_at: string
          dungeon_id: string
          host_id: string
          id: string
          party_id: string
          started_at: string | null
          state: Database["public"]["Enums"]["raid_state"]
        }
        Insert: {
          boss_hp?: number
          boss_max_hp?: number
          completed_at?: string | null
          created_at?: string
          dungeon_id: string
          host_id: string
          id?: string
          party_id: string
          started_at?: string | null
          state?: Database["public"]["Enums"]["raid_state"]
        }
        Update: {
          boss_hp?: number
          boss_max_hp?: number
          completed_at?: string | null
          created_at?: string
          dungeon_id?: string
          host_id?: string
          id?: string
          party_id?: string
          started_at?: string | null
          state?: Database["public"]["Enums"]["raid_state"]
        }
        Relationships: [
          {
            foreignKeyName: "raid_sessions_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "party_roster"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raid_sessions_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raid_sessions_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      party_roster: {
        Row: {
          appearance_id: string | null
          character_class: string | null
          created_at: string | null
          display_name: string | null
          handle: string | null
          id: string | null
          joined_at: string | null
          last_seen_at: string | null
          level: number | null
          party_id: string | null
          raid_contribution: number | null
          role: Database["public"]["Enums"]["party_role"] | null
          status: string | null
          updated_at: string | null
          weekly_xp: number | null
        }
        Relationships: [
          {
            foreignKeyName: "party_members_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_friend_request: {
        Args: { request_id: string }
        Returns: undefined
      }
      cancel_friend_request: {
        Args: { request_id: string }
        Returns: undefined
      }
      complete_raid_session: {
        Args: {
          outcome: string
          requested_damage: number
          requested_session_id: string
        }
        Returns: Json
      }
      create_party_with_leader: {
        Args: { party_name: string }
        Returns: string
      }
      decline_friend_request: {
        Args: { request_id: string }
        Returns: undefined
      }
      heartbeat_player: { Args: never; Returns: undefined }
      heartbeat_raid_session: {
        Args: { is_connected: boolean; requested_session_id: string }
        Returns: undefined
      }
      invite_friend_to_party: { Args: { target_user: string }; Returns: string }
      join_party_by_code: { Args: { code: string }; Returns: string }
      launch_raid_session: {
        Args: { requested_session_id: string }
        Returns: undefined
      }
      leave_current_party: { Args: never; Returns: undefined }
      remove_friend: { Args: { target_user: string }; Returns: undefined }
      remove_party_member: { Args: { target_user: string }; Returns: undefined }
      respond_party_invite: {
        Args: { accept_invite: boolean; invite_id: string }
        Returns: undefined
      }
      search_players: {
        Args: { result_limit?: number; search_term?: string }
        Returns: {
          appearance_id: string
          character_class: string
          created_at: string
          display_name: string
          handle: string
          id: string
          last_seen_at: string
          level: number
          raid_contribution: number
          status: string
          updated_at: string
          weekly_xp: number
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      send_friend_request: { Args: { target_user: string }; Returns: string }
      set_raid_ready: {
        Args: { is_ready: boolean; requested_session_id: string }
        Returns: undefined
      }
      start_raid_session: {
        Args: { requested_dungeon_id: string }
        Returns: string
      }
      sync_player_profile: {
        Args: {
          requested_appearance_id: string
          requested_character_class: string
          requested_display_name: string
          requested_level: number
          requested_progress_xp: number
          requested_raid_contribution: number
        }
        Returns: {
          appearance_id: string
          character_class: string
          created_at: string
          display_name: string
          handle: string
          id: string
          last_seen_at: string
          level: number
          raid_contribution: number
          status: string
          updated_at: string
          weekly_xp: number
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      friend_request_status: "pending" | "accepted" | "declined"
      party_invite_status: "pending" | "accepted" | "declined"
      party_role: "leader" | "member"
      raid_state: "lobby" | "active" | "victory" | "defeat" | "abandoned"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      friend_request_status: ["pending", "accepted", "declined"],
      party_invite_status: ["pending", "accepted", "declined"],
      party_role: ["leader", "member"],
      raid_state: ["lobby", "active", "victory", "defeat", "abandoned"],
    },
  },
} as const
