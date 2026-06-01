export type UserRole = 'admin' | 'it_user' | 'scorer' | 'approver'
export type VendorStatus = 'pending' | 'approved' | 'rejected'
export type RequestStatus = 'draft' | 'scoring' | 'pending_approval' | 'approved' | 'returned'
export type ApprovalStatus = 'pending' | 'approved' | 'returned'
export type ScorerChangeAction = 'added' | 'removed'
export type VendorFieldType = 'text' | 'number' | 'date' | 'select' | 'boolean'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; full_name: string; role: UserRole; created_at: string }
        Insert: { id: string; full_name?: string; role?: UserRole }
        Update: { full_name?: string; role?: UserRole }
        Relationships: []
      }
      vendors: {
        Row: {
          id: string; name: string; tax_id: string | null; type: string
          address: string | null; payment_terms: string | null
          contact_name: string | null; contact_email: string | null; contact_phone: string | null
          status: VendorStatus; created_by: string | null; is_active: boolean; created_at: string
        }
        Insert: {
          id?: string; name: string; tax_id?: string | null; type?: string
          address?: string | null; payment_terms?: string | null
          contact_name?: string | null; contact_email?: string | null; contact_phone?: string | null
          status?: VendorStatus; created_by?: string | null; is_active?: boolean
        }
        Update: {
          name?: string; tax_id?: string | null; type?: string
          address?: string | null; payment_terms?: string | null
          contact_name?: string | null; contact_email?: string | null; contact_phone?: string | null
          status?: VendorStatus; is_active?: boolean
        }
        Relationships: []
      }
      vendor_fields: {
        Row: {
          id: string; field_key: string; field_label: string
          field_type: VendorFieldType; is_required: boolean; sort_order: number; created_at: string
        }
        Insert: {
          id?: string; field_key: string; field_label: string
          field_type?: VendorFieldType; is_required?: boolean; sort_order?: number
        }
        Update: { field_label?: string; field_type?: VendorFieldType; is_required?: boolean; sort_order?: number }
        Relationships: []
      }
      vendor_field_values: {
        Row: { vendor_id: string; field_key: string; value: string | null }
        Insert: { vendor_id: string; field_key: string; value?: string | null }
        Update: { value?: string | null }
        Relationships: []
      }
      selection_requests: {
        Row: {
          id: string; title: string; budget: number; type: string
          deadline: string | null; description: string | null
          status: RequestStatus; owner_id: string; is_active: boolean; created_at: string
        }
        Insert: {
          id?: string; title: string; budget: number; type?: string
          deadline?: string | null; description?: string | null
          status?: RequestStatus; owner_id: string; is_active?: boolean
        }
        Update: {
          title?: string; budget?: number; type?: string
          deadline?: string | null; description?: string | null
          status?: RequestStatus; is_active?: boolean
        }
        Relationships: []
      }
      request_vendors: {
        Row: {
          id: string; request_id: string; vendor_id: string
          quotation_url: string | null; quotation_price: number | null
          payment_terms: string | null; created_at: string
        }
        Insert: {
          id?: string; request_id: string; vendor_id: string
          quotation_url?: string | null; quotation_price?: number | null; payment_terms?: string | null
        }
        Update: { quotation_url?: string | null; quotation_price?: number | null; payment_terms?: string | null }
        Relationships: []
      }
      scoring_criteria: {
        Row: { id: string; request_id: string; name: string; weight: number; sort_order: number; created_at: string }
        Insert: { id?: string; request_id: string; name: string; weight: number; sort_order?: number }
        Update: { name?: string; weight?: number; sort_order?: number }
        Relationships: []
      }
      scorers: {
        Row: {
          id: string; request_id: string; user_id: string
          is_active: boolean; submitted_at: string | null; created_at: string
        }
        Insert: { id?: string; request_id: string; user_id: string; is_active?: boolean; submitted_at?: string | null }
        Update: { is_active?: boolean; submitted_at?: string | null }
        Relationships: []
      }
      scores: {
        Row: {
          id: string; scorer_id: string; request_id: string; vendor_id: string
          criteria_id: string; score: number; created_at: string
        }
        Insert: { id?: string; scorer_id: string; request_id: string; vendor_id: string; criteria_id: string; score: number }
        Update: { score?: number }
        Relationships: []
      }
      scorer_change_log: {
        Row: {
          id: string; request_id: string; action: ScorerChangeAction
          target_user_id: string; reason: string; changed_by: string; created_at: string
        }
        Insert: { id?: string; request_id: string; action: ScorerChangeAction; target_user_id: string; reason: string; changed_by: string }
        Update: Record<string, never>
        Relationships: []
      }
      approval_rules: {
        Row: { id: string; min_budget: number; max_budget: number | null; approver_role: string; level: number; created_at: string }
        Insert: { id?: string; min_budget: number; max_budget?: number | null; approver_role: string; level: number }
        Update: { min_budget?: number; max_budget?: number | null; approver_role?: string; level?: number }
        Relationships: []
      }
      approvals: {
        Row: {
          id: string; request_id: string; level: number
          approver_id: string | null; status: ApprovalStatus
          comment: string | null; decided_at: string | null; created_at: string
        }
        Insert: { id?: string; request_id: string; level: number; approver_id?: string | null; status?: ApprovalStatus; comment?: string | null; decided_at?: string | null }
        Update: { status?: ApprovalStatus; comment?: string | null; decided_at?: string | null }
        Relationships: []
      }
    }
    Views: {
      vendor_weighted_scores: {
        Row: { request_id: string; vendor_id: string; scorer_id: string; scorer_user_id: string; weighted_score: number }
        Relationships: []
      }
    }
    Functions: {
      get_final_scores: {
        Args: { p_request_id: string }
        Returns: { vendor_id: string; final_score: number; scorer_count: number }[]
      }
      is_scoring_unlocked: {
        Args: { p_request_id: string }
        Returns: boolean
      }
      get_my_role: {
        Args: Record<string, never>
        Returns: UserRole
      }
    }
    Enums: {
      user_role: UserRole
      vendor_status: VendorStatus
      request_status: RequestStatus
      approval_status: ApprovalStatus
      scorer_change_action: ScorerChangeAction
      vendor_field_type: VendorFieldType
    }
    CompositeTypes: Record<string, never>
  }
}
