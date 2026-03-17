export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      Cohorts: {
        Row: {
          created_at: string;
          id: number;
          is_active: boolean;
          term: string;
          year: number;
        };
        Insert: {
          created_at?: string;
          id?: number;
          is_active?: boolean;
          term: string;
          year: number;
        };
        Update: {
          created_at?: string;
          id?: number;
          is_active?: boolean;
          term?: string;
          year?: number;
        };
        Relationships: [];
      };
      Roles: {
        Row: {
          created_at: string;
          id: number;
          is_active: boolean;
          name: string;
          type: string;
        };
        Insert: {
          created_at?: string;
          id?: number;
          is_active?: boolean;
          name: string;
          type: string;
        };
        Update: {
          created_at?: string;
          id?: number;
          is_active?: boolean;
          name?: string;
          type?: string;
        };
        Relationships: [];
      };
      Users: {
        Row: {
          created_at: string;
          id: string;
          name: string | null;
          role: Database["public"]["Enums"]["user_roles"] | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name?: string | null;
          role?: Database["public"]["Enums"]["user_roles"] | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string | null;
          role?: Database["public"]["Enums"]["user_roles"] | null;
        };
        Relationships: [];
      };
      VolunteerCohorts: {
        Row: {
          cohort_id: number;
          created_at: string;
          volunteer_id: number;
        };
        Insert: {
          cohort_id: number;
          created_at?: string;
          volunteer_id: number;
        };
        Update: {
          cohort_id?: number;
          created_at?: string;
          volunteer_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "VolunteerCohorts_cohort_id_fkey";
            columns: ["cohort_id"];
            isOneToOne: false;
            referencedRelation: "Cohorts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "VolunteerCohorts_volunteer_id_fkey";
            columns: ["volunteer_id"];
            isOneToOne: false;
            referencedRelation: "Volunteers";
            referencedColumns: ["id"];
          },
        ];
      };
      VolunteerRoles: {
        Row: {
          created_at: string;
          role_id: number;
          volunteer_id: number;
        };
        Insert: {
          created_at?: string;
          role_id: number;
          volunteer_id: number;
        };
        Update: {
          created_at?: string;
          role_id?: number;
          volunteer_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "VolunteerRoles_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "Roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "VolunteerRoles_volunteer_id_fkey";
            columns: ["volunteer_id"];
            isOneToOne: false;
            referencedRelation: "Volunteers";
            referencedColumns: ["id"];
          },
        ];
      };
      Volunteers: {
        Row: {
          created_at: string;
          email: string | null;
          id: number;
          name_org: string;
          notes: string | null;
          opt_in_communication: boolean | null;
          phone: string | null;
          position: string | null;
          pronouns: string | null;
          pseudonym: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id?: number;
          name_org: string;
          notes?: string | null;
          opt_in_communication?: boolean | null;
          phone?: string | null;
          position?: string | null;
          pronouns?: string | null;
          pseudonym?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: number;
          name_org?: string;
          notes?: string | null;
          opt_in_communication?: boolean | null;
          phone?: string | null;
          position?: string | null;
          pronouns?: string | null;
          pseudonym?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_users_with_email: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          created_at: string;
          name: string | null;
          role: Database["public"]["Enums"]["user_roles"] | null;
          email: string | null;
        }[];
      };
      create_volunteer_with_role_and_cohort: {
        Args: {
          p_cohort_term: string;
          p_cohort_year: number;
          p_role_name: string;
          p_role_type: string;
          p_volunteer: Json;
        };
        Returns: number;
      };
      upsert_volunteer_with_roles_and_cohorts: {
        Args: {
          p_name: string | null;
          p_pronouns: string | null;
          p_email: string | null;
          p_phone: string | null;
          p_position: string | null;
          p_cohort: Json | null;
          p_roles: Json;
          p_notes: string | null;
        };
        Returns: number;
      };
    };
    Enums: {
      user_roles: "admin" | "staff";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      user_roles: ["admin", "staff"],
    },
  },
} as const;
