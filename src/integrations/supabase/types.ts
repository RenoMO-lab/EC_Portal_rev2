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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      automation_rules: {
        Row: {
          actions: Json | null
          conditions: Json | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          trigger_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actions?: Json | null
          conditions?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          trigger_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actions?: Json | null
          conditions?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          trigger_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          store_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          store_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          store_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      return_items: {
        Row: {
          condition: string | null
          created_at: string
          exchange_product_id: string | null
          exchange_product_name: string | null
          exchange_variant_id: string | null
          id: string
          product_id: string
          product_image_url: string | null
          product_name: string
          product_sku: string | null
          quantity: number
          return_request_id: string
          unit_price: number
          variant_id: string | null
          variant_name: string | null
        }
        Insert: {
          condition?: string | null
          created_at?: string
          exchange_product_id?: string | null
          exchange_product_name?: string | null
          exchange_variant_id?: string | null
          id?: string
          product_id: string
          product_image_url?: string | null
          product_name: string
          product_sku?: string | null
          quantity?: number
          return_request_id: string
          unit_price: number
          variant_id?: string | null
          variant_name?: string | null
        }
        Update: {
          condition?: string | null
          created_at?: string
          exchange_product_id?: string | null
          exchange_product_name?: string | null
          exchange_variant_id?: string | null
          id?: string
          product_id?: string
          product_image_url?: string | null
          product_name?: string
          product_sku?: string | null
          quantity?: number
          return_request_id?: string
          unit_price?: number
          variant_id?: string | null
          variant_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "return_items_return_request_id_fkey"
            columns: ["return_request_id"]
            isOneToOne: false
            referencedRelation: "return_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      return_policies: {
        Row: {
          allow_exchanges: boolean
          allow_refunds: boolean
          allow_store_credit: boolean
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          requires_original_packaging: boolean
          requires_receipt: boolean
          restocking_fee_percent: number | null
          return_window_days: number
          return_window_start: string
          store_credit_bonus_percent: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_exchanges?: boolean
          allow_refunds?: boolean
          allow_store_credit?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          requires_original_packaging?: boolean
          requires_receipt?: boolean
          restocking_fee_percent?: number | null
          return_window_days?: number
          return_window_start?: string
          store_credit_bonus_percent?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_exchanges?: boolean
          allow_refunds?: boolean
          allow_store_credit?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          requires_original_packaging?: boolean
          requires_receipt?: boolean
          restocking_fee_percent?: number | null
          return_window_days?: number
          return_window_start?: string
          store_credit_bonus_percent?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      return_reasons: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          reason: string
          sort_order: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          reason: string
          sort_order?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          reason?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: []
      }
      return_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          carrier: string | null
          completed_at: string | null
          created_at: string
          customer_email: string
          customer_name: string
          customer_notes: string | null
          defect_image_urls: string[] | null
          id: string
          merchant_notes: string | null
          order_id: string
          order_number: string
          original_amount: number
          other_reason_description: string | null
          policy_id: string | null
          reason: string
          received_at: string | null
          refund_amount: number | null
          refund_method: Database["public"]["Enums"]["refund_method"] | null
          return_type: Database["public"]["Enums"]["return_type"]
          shipped_at: string | null
          status: Database["public"]["Enums"]["return_status"]
          store_credit_amount: number | null
          tracking_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          carrier?: string | null
          completed_at?: string | null
          created_at?: string
          customer_email: string
          customer_name: string
          customer_notes?: string | null
          defect_image_urls?: string[] | null
          id?: string
          merchant_notes?: string | null
          order_id: string
          order_number: string
          original_amount: number
          other_reason_description?: string | null
          policy_id?: string | null
          reason: string
          received_at?: string | null
          refund_amount?: number | null
          refund_method?: Database["public"]["Enums"]["refund_method"] | null
          return_type?: Database["public"]["Enums"]["return_type"]
          shipped_at?: string | null
          status?: Database["public"]["Enums"]["return_status"]
          store_credit_amount?: number | null
          tracking_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          carrier?: string | null
          completed_at?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_notes?: string | null
          defect_image_urls?: string[] | null
          id?: string
          merchant_notes?: string | null
          order_id?: string
          order_number?: string
          original_amount?: number
          other_reason_description?: string | null
          policy_id?: string | null
          reason?: string
          received_at?: string | null
          refund_amount?: number | null
          refund_method?: Database["public"]["Enums"]["refund_method"] | null
          return_type?: Database["public"]["Enums"]["return_type"]
          shipped_at?: string | null
          status?: Database["public"]["Enums"]["return_status"]
          store_credit_amount?: number | null
          tracking_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_requests_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "return_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      return_type_options: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          label: string
          return_type: string
          sort_order: number
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label: string
          return_type?: string
          sort_order?: number
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label?: string
          return_type?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: []
      }
      shipping_fee_settings: {
        Row: {
          created_at: string
          currency: string
          id: string
          new_product_shipping_fee: number
          return_shipping_fee: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          new_product_shipping_fee?: number
          return_shipping_fee?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          new_product_shipping_fee?: number
          return_shipping_fee?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "merchant" | "staff"
      refund_method: "original_payment" | "store_credit" | "gift_card"
      return_status:
        | "pending"
        | "approved"
        | "rejected"
        | "processing"
        | "shipped"
        | "received"
        | "completed"
        | "cancelled"
      return_type: "refund" | "exchange" | "store_credit"
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
      app_role: ["admin", "merchant", "staff"],
      refund_method: ["original_payment", "store_credit", "gift_card"],
      return_status: [
        "pending",
        "approved",
        "rejected",
        "processing",
        "shipped",
        "received",
        "completed",
        "cancelled",
      ],
      return_type: ["refund", "exchange", "store_credit"],
    },
  },
} as const
