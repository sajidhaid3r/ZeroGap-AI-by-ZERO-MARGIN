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
      activity_log: {
        Row: {
          activity_date: string
          activity_type: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          activity_date: string
          activity_type: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          activity_date?: string
          activity_type?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_feedback: {
        Row: {
          created_at: string
          details: string | null
          feedback_type: string
          id: string
          page: string
          reason: string | null
          response_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          feedback_type: string
          id?: string
          page: string
          reason?: string | null
          response_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: string | null
          feedback_type?: string
          id?: string
          page?: string
          reason?: string | null
          response_id?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      college_stats: {
        Row: {
          ats_score: number
          city: string
          college: string
          created_at: string
          id: string
          target_role: string | null
          week_of: string
        }
        Insert: {
          ats_score: number
          city: string
          college: string
          created_at?: string
          id?: string
          target_role?: string | null
          week_of?: string
        }
        Update: {
          ats_score?: number
          city?: string
          college?: string
          created_at?: string
          id?: string
          target_role?: string | null
          week_of?: string
        }
        Relationships: []
      }
      leaderboard_entries: {
        Row: {
          anonymous_name: string
          ats_score: number
          city: string
          college: string
          id: string
          improvement_delta: number
          opted_in: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          anonymous_name: string
          ats_score: number
          city: string
          college: string
          id?: string
          improvement_delta?: number
          opted_in?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          anonymous_name?: string
          ats_score?: number
          city?: string
          college?: string
          id?: string
          improvement_delta?: number
          opted_in?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mock_tests: {
        Row: {
          city: string
          completed_at: string
          correct_count: number
          domain: string
          emoji_reaction: string | null
          feedback_rating: number | null
          feedback_text: string | null
          id: string
          questions_json: Json
          score: number
          skipped_count: number
          test_id: string
          time_taken_secs: number
          total_marks: number
          user_id: string
          violation_log: Json
          violations_count: number
          wrong_count: number
          xp_earned: number
        }
        Insert: {
          city: string
          completed_at?: string
          correct_count?: number
          domain: string
          emoji_reaction?: string | null
          feedback_rating?: number | null
          feedback_text?: string | null
          id?: string
          questions_json?: Json
          score?: number
          skipped_count?: number
          test_id: string
          time_taken_secs?: number
          total_marks?: number
          user_id: string
          violation_log?: Json
          violations_count?: number
          wrong_count?: number
          xp_earned?: number
        }
        Update: {
          city?: string
          completed_at?: string
          correct_count?: number
          domain?: string
          emoji_reaction?: string | null
          feedback_rating?: number | null
          feedback_text?: string | null
          id?: string
          questions_json?: Json
          score?: number
          skipped_count?: number
          test_id?: string
          time_taken_secs?: number
          total_marks?: number
          user_id?: string
          violation_log?: Json
          violations_count?: number
          wrong_count?: number
          xp_earned?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          college: string | null
          created_at: string
          display_name: string | null
          id: string
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          college?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          college?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          max_uses: number
          user_id: string
          uses_count: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          max_uses?: number
          user_id: string
          uses_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          max_uses?: number
          user_id?: string
          uses_count?: number
        }
        Relationships: []
      }
      referral_uses: {
        Row: {
          code: string
          created_at: string
          id: string
          referred_user_id: string
          referrer_user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          referred_user_id: string
          referrer_user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          referred_user_id?: string
          referrer_user_id?: string
        }
        Relationships: []
      }
      resume_analyses: {
        Row: {
          ats_score: number
          created_at: string
          file_name: string
          id: string
          missing_keywords: Json
          strengths: Json
          suggestions: Json
          summary: string | null
          trend_score: number
          user_id: string
          weaknesses: Json
        }
        Insert: {
          ats_score: number
          created_at?: string
          file_name: string
          id?: string
          missing_keywords?: Json
          strengths?: Json
          suggestions?: Json
          summary?: string | null
          trend_score: number
          user_id: string
          weaknesses?: Json
        }
        Update: {
          ats_score?: number
          created_at?: string
          file_name?: string
          id?: string
          missing_keywords?: Json
          strengths?: Json
          suggestions?: Json
          summary?: string | null
          trend_score?: number
          user_id?: string
          weaknesses?: Json
        }
        Relationships: []
      }
      roadmap_tasks: {
        Row: {
          completed: boolean
          created_at: string
          description: string | null
          goal: string
          hour_block: number
          id: string
          title: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          description?: string | null
          goal: string
          hour_block: number
          id?: string
          title: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          description?: string | null
          goal?: string
          hour_block?: number
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          current_level: number
          current_streak: number
          id: string
          last_test_date: string | null
          longest_streak: number
          tests_completed: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_level?: number
          current_streak?: number
          id?: string
          last_test_date?: string | null
          longest_streak?: number
          tests_completed?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_level?: number
          current_streak?: number
          id?: string
          last_test_date?: string | null
          longest_streak?: number
          tests_completed?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          freezes_remaining: number
          last_active_date: string | null
          longest_streak: number
          streak_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          freezes_remaining?: number
          last_active_date?: string | null
          longest_streak?: number
          streak_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          freezes_remaining?: number
          last_active_date?: string | null
          longest_streak?: number
          streak_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
