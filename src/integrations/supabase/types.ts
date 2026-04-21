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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          description: string | null
          id: string
          is_secret: boolean | null
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          is_secret?: boolean | null
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          is_secret?: boolean | null
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      deposit_requests: {
        Row: {
          amount: number
          created_at: string | null
          crypto_address: string | null
          crypto_currency: string | null
          currency: string
          id: string
          method: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tx_hash: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          crypto_address?: string | null
          crypto_currency?: string | null
          currency?: string
          id?: string
          method: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tx_hash?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          crypto_address?: string | null
          crypto_currency?: string | null
          currency?: string
          id?: string
          method?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tx_hash?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      game_rounds: {
        Row: {
          bet_amount: number
          client_seed: string | null
          created_at: string | null
          game_type: string
          id: string
          multiplier: number | null
          nonce: number | null
          payout: number | null
          result: Json | null
          server_seed: string | null
          server_seed_hash: string | null
          status: string | null
          user_id: string
          won: boolean | null
        }
        Insert: {
          bet_amount: number
          client_seed?: string | null
          created_at?: string | null
          game_type: string
          id?: string
          multiplier?: number | null
          nonce?: number | null
          payout?: number | null
          result?: Json | null
          server_seed?: string | null
          server_seed_hash?: string | null
          status?: string | null
          user_id: string
          won?: boolean | null
        }
        Update: {
          bet_amount?: number
          client_seed?: string | null
          created_at?: string | null
          game_type?: string
          id?: string
          multiplier?: number | null
          nonce?: number | null
          payout?: number | null
          result?: Json | null
          server_seed?: string | null
          server_seed_hash?: string | null
          status?: string | null
          user_id?: string
          won?: boolean | null
        }
        Relationships: []
      }
      games: {
        Row: {
          category: string
          config: Json | null
          created_at: string | null
          house_edge: number | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          is_hot: boolean | null
          is_new: boolean | null
          max_bet: number | null
          min_bet: number | null
          name: string
          provider: string | null
          rtp: number | null
          slug: string
          sort_order: number | null
          thumbnail_url: string | null
        }
        Insert: {
          category?: string
          config?: Json | null
          created_at?: string | null
          house_edge?: number | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          is_hot?: boolean | null
          is_new?: boolean | null
          max_bet?: number | null
          min_bet?: number | null
          name: string
          provider?: string | null
          rtp?: number | null
          slug: string
          sort_order?: number | null
          thumbnail_url?: string | null
        }
        Update: {
          category?: string
          config?: Json | null
          created_at?: string | null
          house_edge?: number | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          is_hot?: boolean | null
          is_new?: boolean | null
          max_bet?: number | null
          min_bet?: number | null
          name?: string
          provider?: string | null
          rtp?: number | null
          slug?: string
          sort_order?: number | null
          thumbnail_url?: string | null
        }
        Relationships: []
      }
      house_wallet: {
        Row: {
          balance: number | null
          id: string
          total_bets: number | null
          total_bets_today: number | null
          total_payouts: number | null
          total_payouts_today: number | null
          updated_at: string | null
        }
        Insert: {
          balance?: number | null
          id?: string
          total_bets?: number | null
          total_bets_today?: number | null
          total_payouts?: number | null
          total_payouts_today?: number | null
          updated_at?: string | null
        }
        Update: {
          balance?: number | null
          id?: string
          total_bets?: number | null
          total_bets_today?: number | null
          total_payouts?: number | null
          total_payouts_today?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      platform_stats: {
        Row: {
          id: string
          stat_key: string
          stat_value: number | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          stat_key: string
          stat_value?: number | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          stat_key?: string
          stat_value?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          id: string
          level: number
          updated_at: string | null
          user_id: string
          username: string | null
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          level?: number
          updated_at?: string | null
          user_id: string
          username?: string | null
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          level?: number
          updated_at?: string | null
          user_id?: string
          username?: string | null
          xp?: number
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          balance_after: number | null
          created_at: string | null
          description: string | null
          id: string
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number | null
          currency: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          currency?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          currency?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          amount: number
          created_at: string | null
          crypto_currency: string | null
          currency: string
          destination: string
          id: string
          method: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tx_hash: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          crypto_currency?: string | null
          currency?: string
          destination: string
          id?: string
          method: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tx_hash?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          crypto_currency?: string | null
          currency?: string
          destination?: string
          id?: string
          method?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tx_hash?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_test_credit: { Args: { p_amount: number }; Returns: Json }
      approve_deposit: {
        Args: { p_note?: string; p_request_id: string }
        Returns: Json
      }
      approve_withdrawal: {
        Args: { p_note?: string; p_request_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      place_bet: {
        Args: {
          p_bet_amount: number
          p_client_seed?: string
          p_game_type: string
          p_multiplier?: number
          p_nonce?: number
          p_payout?: number
          p_result?: Json
          p_server_seed?: string
        }
        Returns: Json
      }
      reject_deposit: {
        Args: { p_note?: string; p_request_id: string }
        Returns: Json
      }
      reject_withdrawal: {
        Args: { p_note?: string; p_request_id: string }
        Returns: Json
      }
      request_withdrawal: {
        Args: {
          p_amount: number
          p_crypto_currency?: string
          p_destination: string
          p_method: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
