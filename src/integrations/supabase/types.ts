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
      employees: {
        Row: {
          created_at: string
          email: string
          employee_id: string
          id: string
          is_active: boolean
          name: string
          password: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          employee_id: string
          id?: string
          is_active?: boolean
          name: string
          password: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          employee_id?: string
          id?: string
          is_active?: boolean
          name?: string
          password?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          created_at: string
          department: string | null
          id: string
          is_active: boolean
          job_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          id?: string
          is_active?: boolean
          job_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          id?: string
          is_active?: boolean
          job_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      referral_status_history: {
        Row: {
          changed_by: string
          created_at: string
          id: string
          note: string | null
          referral_id: string
          status: Database["public"]["Enums"]["referral_status"]
        }
        Insert: {
          changed_by: string
          created_at?: string
          id?: string
          note?: string | null
          referral_id: string
          status: Database["public"]["Enums"]["referral_status"]
        }
        Update: {
          changed_by?: string
          created_at?: string
          id?: string
          note?: string | null
          referral_id?: string
          status?: Database["public"]["Enums"]["referral_status"]
        }
        Relationships: [
          {
            foreignKeyName: "referral_status_history_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          candidate_dob: string
          candidate_email: string
          candidate_first_name: string
          candidate_last_name: string
          candidate_middle_name: string | null
          candidate_phone: string
          created_at: string
          current_status: Database["public"]["Enums"]["referral_status"]
          how_know_candidate: string
          id: string
          job_id: string
          referrer_id: string
          resume_path: string | null
          updated_at: string
        }
        Insert: {
          candidate_dob: string
          candidate_email: string
          candidate_first_name: string
          candidate_last_name: string
          candidate_middle_name?: string | null
          candidate_phone: string
          created_at?: string
          current_status?: Database["public"]["Enums"]["referral_status"]
          how_know_candidate: string
          id?: string
          job_id: string
          referrer_id: string
          resume_path?: string | null
          updated_at?: string
        }
        Update: {
          candidate_dob?: string
          candidate_email?: string
          candidate_first_name?: string
          candidate_last_name?: string
          candidate_middle_name?: string | null
          candidate_phone?: string
          created_at?: string
          current_status?: Database["public"]["Enums"]["referral_status"]
          how_know_candidate?: string
          id?: string
          job_id?: string
          referrer_id?: string
          resume_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_job_by_hr: {
        Args: {
          p_department: string
          p_email: string
          p_employee_id: string
          p_job_id: string
          p_title: string
        }
        Returns: string
      }
      create_referral: {
        Args: {
          p_candidate_dob: string
          p_candidate_email: string
          p_candidate_first_name: string
          p_candidate_last_name: string
          p_candidate_middle_name: string
          p_candidate_phone: string
          p_how_know_candidate: string
          p_job_id: string
          p_resume_path: string
        }
        Returns: string
      }
      create_referral_secure: {
        Args: {
          p_candidate_dob: string
          p_candidate_email: string
          p_candidate_first_name: string
          p_candidate_last_name: string
          p_candidate_middle_name: string
          p_candidate_phone: string
          p_employee_email: string
          p_employee_id: string
          p_how_know_candidate: string
          p_job_id: string
          p_resume_path: string
        }
        Returns: string
      }
      get_active_jobs_for_employee: {
        Args: { p_email: string; p_employee_id: string }
        Returns: {
          created_at: string
          department: string | null
          id: string
          is_active: boolean
          job_id: string
          title: string
          updated_at: string
        }[]
      }
      get_all_jobs_for_hr: {
        Args: { p_email: string; p_employee_id: string }
        Returns: {
          created_at: string
          department: string | null
          id: string
          is_active: boolean
          job_id: string
          title: string
          updated_at: string
        }[]
      }
      get_current_employee_from_custom_auth: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_employee_info: {
        Args: { p_email: string; p_employee_id: string }
        Returns: {
          created_at: string
          email: string
          employee_id: string
          id: string
          is_active: boolean
          name: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }[]
      }
      get_hr_employee_uuid: {
        Args: { p_email: string; p_employee_id: string }
        Returns: string
      }
      get_referral_status_history_for_employee: {
        Args: { p_email: string; p_employee_id: string; p_referral_id: string }
        Returns: {
          changed_by: string
          created_at: string
          id: string
          note: string
          status: Database["public"]["Enums"]["referral_status"]
          user_name: string
        }[]
      }
      get_referral_status_history_for_hr: {
        Args: { p_email: string; p_employee_id: string; p_referral_id: string }
        Returns: {
          changed_by: string
          created_at: string
          id: string
          note: string
          status: Database["public"]["Enums"]["referral_status"]
          user_name: string
        }[]
      }
      get_referrals_by_employee_identifier: {
        Args: { p_email?: string; p_employee_id: string }
        Returns: {
          candidate_email: string
          candidate_first_name: string
          candidate_last_name: string
          candidate_middle_name: string
          candidate_phone: string
          created_at: string
          current_status: Database["public"]["Enums"]["referral_status"]
          how_know_candidate: string
          id: string
          job_department: string
          job_id: string
          job_job_id: string
          job_title: string
          resume_path: string
          updated_at: string
        }[]
      }
      get_referrals_for_hr_by_identifier: {
        Args: { p_email: string; p_employee_id: string }
        Returns: {
          candidate_dob: string
          candidate_email: string
          candidate_first_name: string
          candidate_last_name: string
          candidate_middle_name: string
          candidate_phone: string
          created_at: string
          current_status: Database["public"]["Enums"]["referral_status"]
          how_know_candidate: string
          id: string
          job_department: string
          job_job_id: string
          job_title: string
          job_uuid: string
          referrer_employee_id: string
          referrer_name: string
          resume_path: string
          updated_at: string
        }[]
      }
      get_user_profile_for_status: {
        Args: { user_id: string }
        Returns: {
          first_name: string
          last_name: string
        }[]
      }
      is_current_user_hr: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      toggle_job_active_by_hr: {
        Args: {
          p_email: string
          p_employee_id: string
          p_is_active: boolean
          p_job_id: string
        }
        Returns: undefined
      }
      update_job_by_hr: {
        Args: {
          p_department: string
          p_email: string
          p_employee_id: string
          p_id: string
          p_job_id: string
          p_title: string
        }
        Returns: undefined
      }
      update_referral_status_by_hr: {
        Args: {
          p_email: string
          p_employee_id: string
          p_note: string
          p_referral_id: string
          p_status: Database["public"]["Enums"]["referral_status"]
        }
        Returns: undefined
      }
      validate_employee_login: {
        Args: { p_email: string; p_employee_id: string; p_password: string }
        Returns: {
          created_at: string
          email: string
          employee_id: string
          id: string
          is_active: boolean
          name: string
          password: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }[]
      }
    }
    Enums: {
      referral_status:
        | "submitted"
        | "screening"
        | "interview"
        | "offer"
        | "hired"
        | "rejected"
      user_role: "employee" | "hr"
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
      referral_status: [
        "submitted",
        "screening",
        "interview",
        "offer",
        "hired",
        "rejected",
      ],
      user_role: ["employee", "hr"],
    },
  },
} as const
