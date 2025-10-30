export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      administrators: {
        Row: {
          created_at: string
          id: number
          role: string
          tournament_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          role: string
          tournament_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          role?: string
          tournament_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "administrators_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "administrators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: string
          id: number
          tournament_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details: string
          id?: number
          tournament_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: string
          id?: number
          tournament_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          first_turn_player_id: number | null
          forfeited_player_id: number | null
          id: number
          is_forfeit: boolean | null
          player_a_id: number
          player_b_id: number | null
          round: number
          score_a: number | null
          score_b: number | null
          status: string
          tournament_id: string
        }
        Insert: {
          created_at?: string
          first_turn_player_id?: number | null
          forfeited_player_id?: number | null
          id?: number
          is_forfeit?: boolean | null
          player_a_id: number
          player_b_id?: number | null
          round: number
          score_a?: number | null
          score_b?: number | null
          status: string
          tournament_id: string
        }
        Update: {
          created_at?: string
          first_turn_player_id?: number | null
          forfeited_player_id?: number | null
          id?: number
          is_forfeit?: boolean | null
          player_a_id?: number
          player_b_id?: number | null
          round?: number
          score_a?: number | null
          score_b?: number | null
          status?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_forfeited_player_id_fkey"
            columns: ["forfeited_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_player_a_id_fkey"
            columns: ["player_a_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_player_b_id_fkey"
            columns: ["player_b_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_first_turn_player_id_fkey"
            columns: ["first_turn_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          }
        ]
      }
      pairing_rules: {
        Row: {
          id: number
          created_at: string
          tournament_id: string
          start_round: number
          end_round: number
          pairing_method: string
          standings_source: string
          allowed_repeats: number
          quartile_pairing_scheme: string | null
        }
        Insert: {
          id?: number
          created_at?: string
          tournament_id: string
          start_round: number
          end_round: number
          pairing_method: string
          standings_source: string
          allowed_repeats: number
          quartile_pairing_scheme?: string | null
        }
        Update: {
          id?: number
          created_at?: string
          tournament_id?: string
          start_round?: number
          end_round?: number
          pairing_method?: string
          standings_source?: string
          allowed_repeats?: number
          quartile_pairing_scheme?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pairing_rules_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          bye_rounds: number[]
          class_id: number | null
          created_at: string
          division_id: number | null
          id: number
          name: string
          rating: number
          seed: number
          status: string
          team_id: number | null
          tournament_id: string
        }
        Insert: {
          bye_rounds: number[]
          class_id?: number | null
          created_at?: string
          division_id?: number | null
          id?: number
          name: string
          rating: number
          seed: number
          status: string
          team_id?: number | null
          tournament_id: string
        }
        Update: {
          bye_rounds?: number[]
          class_id?: number | null
          created_at?: string
          division_id?: number | null
          id?: number
          name?: string
          rating?: number
          seed?: number
          status?: string
          team_id?: number | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      standings_snapshots: {
        Row: {
          created_at: string
          id: number
          round: number
          standings_data: Json
          tournament_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          round: number
          standings_data: Json
          tournament_id: string
        }
        Update: {
          created_at?: string
          id?: number
          round?: number
          standings_data?: Json
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "standings_snapshots_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: number
          name: string
          tournament_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
          tournament_id: string
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          bye_assignment_method: string | null
          bye_spread: number
          classes: Json | null
          created_at: string
          deleted_at: string | null
          discipline: string
          division_mode: string
          divisions: Json | null
          forfeit_loss_score: number | null
          forfeit_win_score: number | null
          gibson_rounds: number | null
          id: string
          name: string
          player_count: number
          post_tournament_ratings: Json | null
          public_portal_settings: Json | null
          ratings_system_settings: Json | null
          round_robin_plays_per_opponent: number
          scoring: Json | null
          slug: string
          status: string
          team_settings: Json | null
          tie_break_order: string[] | null
          total_rounds: number
          tournament_mode: string
          user_id: string
        }
        Insert: {
          bye_assignment_method?: string | null
          bye_spread?: number
          classes?: Json | null
          created_at?: string
          deleted_at?: string | null
          discipline: string
          division_mode: string
          divisions?: Json | null
          forfeit_loss_score?: number | null
          forfeit_win_score?: number | null
          gibson_rounds?: number | null
          id: string
          name: string
          player_count?: number
          post_tournament_ratings?: Json | null
          public_portal_settings?: Json | null
          ratings_system_settings?: Json | null
          round_robin_plays_per_opponent: number
          scoring?: Json | null
          slug: string
          status: string
          team_settings?: Json | null
          tie_break_order?: string[] | null
          total_rounds: number
          tournament_mode: string
          user_id: string
        }
        Update: {
          bye_assignment_method?: string | null
          bye_spread?: number
          classes?: Json | null
          created_at?: string
          deleted_at?: string | null
          discipline?: string
          division_mode?: string
          divisions?: Json | null
          forfeit_loss_score?: number | null
          forfeit_win_score?: number | null
          gibson_rounds?: number | null
          id?: string
          name?: string
          player_count?: number
          post_tournament_ratings?: Json | null
          public_portal_settings?: Json | null
          ratings_system_settings?: Json | null
          round_robin_plays_per_opponent?: number
          scoring?: Json | null
          slug?: string
          status?: string
          team_settings?: Json | null
          tie_break_order?: string[] | null
          total_rounds?: number
          tournament_mode?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country_code: string | null
          created_at: string
          display_name: string
          email: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country_code?: string | null
          created_at?: string
          display_name: string
          email?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country_code?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_tournament_admin: {
        Args: {
          p_tournament_id: string
        }
        Returns: boolean
      }
      is_tournament_head_td: {
        Args: {
          p_tournament_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}


type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never