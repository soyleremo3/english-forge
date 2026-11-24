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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ai_usage: {
        Row: {
          created_at: string
          day: string
          feature: string
          id: number
          model: string | null
          ok: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          day: string
          feature: string
          id?: never
          model?: string | null
          ok: boolean
          user_id?: string
        }
        Update: {
          created_at?: string
          day?: string
          feature?: string
          id?: never
          model?: string | null
          ok?: boolean
          user_id?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          badge_key: string
          earned_at: string
          user_id: string
        }
        Insert: {
          badge_key: string
          earned_at?: string
          user_id?: string
        }
        Update: {
          badge_key?: string
          earned_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          freezes_available: number
          settings: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          freezes_available?: number
          settings?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          freezes_available?: number
          settings?: Json
          user_id?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          created_at: string
          id: number
          items: Json
          kind: string
          score: number | null
          study_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          items?: Json
          kind: string
          score?: number | null
          study_date: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: never
          items?: Json
          kind?: string
          score?: number | null
          study_date?: string
          user_id?: string
        }
        Relationships: []
      }
      review_logs: {
        Row: {
          ai_checked: boolean
          answer: string | null
          created_at: string
          direction: string | null
          id: number
          kind: string
          rating: number | null
          result: string | null
          user_id: string
          user_word_id: number
        }
        Insert: {
          ai_checked?: boolean
          answer?: string | null
          created_at?: string
          direction?: string | null
          id?: never
          kind: string
          rating?: number | null
          result?: string | null
          user_id?: string
          user_word_id: number
        }
        Update: {
          ai_checked?: boolean
          answer?: string | null
          created_at?: string
          direction?: string | null
          id?: never
          kind?: string
          rating?: number | null
          result?: string | null
          user_id?: string
          user_word_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "review_logs_user_word_id_fkey"
            columns: ["user_word_id"]
            isOneToOne: false
            referencedRelation: "user_words"
            referencedColumns: ["id"]
          },
        ]
      }
      sentences: {
        Row: {
          ai_feedback: Json | null
          corrected: string | null
          created_at: string
          id: number
          ok: boolean | null
          text: string
          user_id: string
          word_id: number | null
        }
        Insert: {
          ai_feedback?: Json | null
          corrected?: string | null
          created_at?: string
          id?: never
          ok?: boolean | null
          text: string
          user_id?: string
          word_id?: number | null
        }
        Update: {
          ai_feedback?: Json | null
          corrected?: string | null
          created_at?: string
          id?: never
          ok?: boolean | null
          text?: string
          user_id?: string
          word_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sentences_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
        ]
      }
      study_days: {
        Row: {
          completed_at: string | null
          daily_test_score: number | null
          frozen: boolean
          minutes: number
          study_date: string
          tasks: Json
          user_id: string
          xp: number
        }
        Insert: {
          completed_at?: string | null
          daily_test_score?: number | null
          frozen?: boolean
          minutes?: number
          study_date: string
          tasks?: Json
          user_id?: string
          xp?: number
        }
        Update: {
          completed_at?: string | null
          daily_test_score?: number | null
          frozen?: boolean
          minutes?: number
          study_date?: string
          tasks?: Json
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      user_words: {
        Row: {
          accepted_answers: string[]
          created_at: string
          custom_tr: string[] | null
          difficulty: number
          due: string | null
          elapsed_days: number
          id: number
          introduced_on: string | null
          lapses: number
          last_review: string | null
          learning_steps: number
          notes: string | null
          reps: number
          scheduled_days: number
          stability: number
          state: number
          status: string
          user_id: string
          word_id: number
        }
        Insert: {
          accepted_answers?: string[]
          created_at?: string
          custom_tr?: string[] | null
          difficulty?: number
          due?: string | null
          elapsed_days?: number
          id?: never
          introduced_on?: string | null
          lapses?: number
          last_review?: string | null
          learning_steps?: number
          notes?: string | null
          reps?: number
          scheduled_days?: number
          stability?: number
          state?: number
          status?: string
          user_id?: string
          word_id: number
        }
        Update: {
          accepted_answers?: string[]
          created_at?: string
          custom_tr?: string[] | null
          difficulty?: number
          due?: string | null
          elapsed_days?: number
          id?: never
          introduced_on?: string | null
          lapses?: number
          last_review?: string | null
          learning_steps?: number
          notes?: string | null
          reps?: number
          scheduled_days?: number
          stability?: number
          state?: number
          status?: string
          user_id?: string
          word_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_words_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
        ]
      }
      words: {
        Row: {
          cefr: string | null
          created_at: string
          created_by: string | null
          en_alternatives: string[]
          en_definition: string | null
          example_en: string | null
          example_tr: string | null
          id: number
          is_function_word: boolean
          lemma: string
          pos: string | null
          rank: number | null
          source: string
          tr_meanings: string[]
        }
        Insert: {
          cefr?: string | null
          created_at?: string
          created_by?: string | null
          en_alternatives?: string[]
          en_definition?: string | null
          example_en?: string | null
          example_tr?: string | null
          id?: never
          is_function_word?: boolean
          lemma: string
          pos?: string | null
          rank?: number | null
          source: string
          tr_meanings?: string[]
        }
        Update: {
          cefr?: string | null
          created_at?: string
          created_by?: string | null
          en_alternatives?: string[]
          en_definition?: string | null
          example_en?: string | null
          example_tr?: string | null
          id?: never
          is_function_word?: boolean
          lemma?: string
          pos?: string | null
          rank?: number | null
          source?: string
          tr_meanings?: string[]
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
