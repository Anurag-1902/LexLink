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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      case_citations: {
        Row: {
          citation_text: string | null
          cited_case_id: string | null
          citing_case_id: string | null
          created_at: string
          id: string
        }
        Insert: {
          citation_text?: string | null
          cited_case_id?: string | null
          citing_case_id?: string | null
          created_at?: string
          id?: string
        }
        Update: {
          citation_text?: string | null
          cited_case_id?: string | null
          citing_case_id?: string | null
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_citations_cited_case_id_fkey"
            columns: ["cited_case_id"]
            isOneToOne: false
            referencedRelation: "legal_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_citations_citing_case_id_fkey"
            columns: ["citing_case_id"]
            isOneToOne: false
            referencedRelation: "legal_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_contradictions: {
        Row: {
          case_a_id: string | null
          case_b_id: string | null
          confidence_score: number | null
          conflict_type: string
          created_at: string
          description: string | null
          id: string
        }
        Insert: {
          case_a_id?: string | null
          case_b_id?: string | null
          confidence_score?: number | null
          conflict_type: string
          created_at?: string
          description?: string | null
          id?: string
        }
        Update: {
          case_a_id?: string | null
          case_b_id?: string | null
          confidence_score?: number | null
          conflict_type?: string
          created_at?: string
          description?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_contradictions_case_a_id_fkey"
            columns: ["case_a_id"]
            isOneToOne: false
            referencedRelation: "legal_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_contradictions_case_b_id_fkey"
            columns: ["case_b_id"]
            isOneToOne: false
            referencedRelation: "legal_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_similarities: {
        Row: {
          case_a_id: string | null
          case_b_id: string | null
          created_at: string
          id: string
          similarity_score: number
        }
        Insert: {
          case_a_id?: string | null
          case_b_id?: string | null
          created_at?: string
          id?: string
          similarity_score: number
        }
        Update: {
          case_a_id?: string | null
          case_b_id?: string | null
          created_at?: string
          id?: string
          similarity_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "case_similarities_case_a_id_fkey"
            columns: ["case_a_id"]
            isOneToOne: false
            referencedRelation: "legal_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_similarities_case_b_id_fkey"
            columns: ["case_b_id"]
            isOneToOne: false
            referencedRelation: "legal_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_cases: {
        Row: {
          case_id: string
          case_opinions: Json | null
          citations: Json | null
          court: string
          created_at: string
          decision_date: string | null
          docket_number: string | null
          embeddings: string | null
          frontend_url: string | null
          full_text: string | null
          headnotes: string | null
          id: string
          jurisdiction: string | null
          metadata: Json | null
          name: string
          name_abbreviation: string | null
          preview: string[] | null
          summary: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          case_id: string
          case_opinions?: Json | null
          citations?: Json | null
          court: string
          created_at?: string
          decision_date?: string | null
          docket_number?: string | null
          embeddings?: string | null
          frontend_url?: string | null
          full_text?: string | null
          headnotes?: string | null
          id?: string
          jurisdiction?: string | null
          metadata?: Json | null
          name: string
          name_abbreviation?: string | null
          preview?: string[] | null
          summary?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          case_id?: string
          case_opinions?: Json | null
          citations?: Json | null
          court?: string
          created_at?: string
          decision_date?: string | null
          docket_number?: string | null
          embeddings?: string | null
          frontend_url?: string | null
          full_text?: string | null
          headnotes?: string | null
          id?: string
          jurisdiction?: string | null
          metadata?: Json | null
          name?: string
          name_abbreviation?: string | null
          preview?: string[] | null
          summary?: string | null
          updated_at?: string
          url?: string | null
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
