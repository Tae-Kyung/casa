export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'user' | 'mentor' | 'admin'
export type Locale = 'ko' | 'en' | 'ja' | 'zh'
export type Theme = 'light' | 'dark' | 'system'
export type ProjectStatus = 'draft' | 'in_progress' | 'completed' | 'archived'
export type ProjectStage = 'idea' | 'evaluation' | 'document' | 'deploy' | 'done'
export type GateStatus = 'gate_1' | 'gate_2' | 'gate_3' | 'gate_4' | 'completed'
export type DocumentType = 'business_plan' | 'pitch' | 'landing' | 'ppt' | 'leaflet' | 'infographic'
export type FeedbackType = 'comment' | 'approval' | 'rejection' | 'revision_request'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'revision_requested'
export type PromptCategory = 'ideation' | 'evaluation' | 'document' | 'marketing'

export interface Database {
  public: {
    Tables: {
      bi_users: {
        Row: {
          id: string
          email: string
          name: string | null
          role: UserRole
          locale: Locale
          theme: Theme
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          role?: UserRole
          locale?: Locale
          theme?: Theme
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          role?: UserRole
          locale?: Locale
          theme?: Theme
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      bi_projects: {
        Row: {
          id: string
          user_id: string
          name: string
          status: ProjectStatus
          current_stage: ProjectStage
          current_gate: GateStatus
          gate_1_passed_at: string | null
          gate_2_passed_at: string | null
          gate_3_passed_at: string | null
          gate_4_passed_at: string | null
          mentor_approval_required: boolean
          assigned_mentor_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          status?: ProjectStatus
          current_stage?: ProjectStage
          current_gate?: GateStatus
          gate_1_passed_at?: string | null
          gate_2_passed_at?: string | null
          gate_3_passed_at?: string | null
          gate_4_passed_at?: string | null
          mentor_approval_required?: boolean
          assigned_mentor_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          status?: ProjectStatus
          current_stage?: ProjectStage
          current_gate?: GateStatus
          gate_1_passed_at?: string | null
          gate_2_passed_at?: string | null
          gate_3_passed_at?: string | null
          gate_4_passed_at?: string | null
          mentor_approval_required?: boolean
          assigned_mentor_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      bi_idea_cards: {
        Row: {
          id: string
          project_id: string
          raw_input: string
          problem: string | null
          solution: string | null
          target: string | null
          differentiation: string | null
          ai_expanded: Json | null
          ai_model_used: string
          is_confirmed: boolean
          confirmed_at: string | null
          confirmed_by: string | null
          revision_count: number
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          raw_input: string
          problem?: string | null
          solution?: string | null
          target?: string | null
          differentiation?: string | null
          ai_expanded?: Json | null
          ai_model_used?: string
          is_confirmed?: boolean
          confirmed_at?: string | null
          confirmed_by?: string | null
          revision_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          raw_input?: string
          problem?: string | null
          solution?: string | null
          target?: string | null
          differentiation?: string | null
          ai_expanded?: Json | null
          ai_model_used?: string
          is_confirmed?: boolean
          confirmed_at?: string | null
          confirmed_by?: string | null
          revision_count?: number
          created_at?: string
        }
        Relationships: []
      }
      bi_evaluations: {
        Row: {
          id: string
          project_id: string
          investor_score: number | null
          investor_feedback: string | null
          investor_ai_model: string
          market_score: number | null
          market_feedback: string | null
          market_ai_model: string
          tech_score: number | null
          tech_feedback: string | null
          tech_ai_model: string
          total_score: number | null
          recommendations: Json | null
          debate_enabled: boolean
          debate_rounds: number
          debate_log: Json | null
          is_confirmed: boolean
          confirmed_at: string | null
          confirmed_by: string | null
          dispute_comment: string | null
          reevaluation_count: number
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          investor_score?: number | null
          investor_feedback?: string | null
          investor_ai_model?: string
          market_score?: number | null
          market_feedback?: string | null
          market_ai_model?: string
          tech_score?: number | null
          tech_feedback?: string | null
          tech_ai_model?: string
          total_score?: number | null
          recommendations?: Json | null
          debate_enabled?: boolean
          debate_rounds?: number
          debate_log?: Json | null
          is_confirmed?: boolean
          confirmed_at?: string | null
          confirmed_by?: string | null
          dispute_comment?: string | null
          reevaluation_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          investor_score?: number | null
          investor_feedback?: string | null
          investor_ai_model?: string
          market_score?: number | null
          market_feedback?: string | null
          market_ai_model?: string
          tech_score?: number | null
          tech_feedback?: string | null
          tech_ai_model?: string
          total_score?: number | null
          recommendations?: Json | null
          debate_enabled?: boolean
          debate_rounds?: number
          debate_log?: Json | null
          is_confirmed?: boolean
          confirmed_at?: string | null
          confirmed_by?: string | null
          dispute_comment?: string | null
          reevaluation_count?: number
          created_at?: string
        }
        Relationships: []
      }
      bi_documents: {
        Row: {
          id: string
          project_id: string
          type: DocumentType
          title: string
          content: string | null
          storage_path: string | null
          file_name: string | null
          ai_model_used: string
          is_confirmed: boolean
          confirmed_at: string | null
          confirmed_by: string | null
          revision_requests: Json | null
          revision_count: number
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          type: DocumentType
          title: string
          content?: string | null
          storage_path?: string | null
          file_name?: string | null
          ai_model_used?: string
          is_confirmed?: boolean
          confirmed_at?: string | null
          confirmed_by?: string | null
          revision_requests?: Json | null
          revision_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          type?: DocumentType
          title?: string
          content?: string | null
          storage_path?: string | null
          file_name?: string | null
          ai_model_used?: string
          is_confirmed?: boolean
          confirmed_at?: string | null
          confirmed_by?: string | null
          revision_requests?: Json | null
          revision_count?: number
          created_at?: string
        }
        Relationships: []
      }
      bi_feedbacks: {
        Row: {
          id: string
          project_id: string
          user_id: string
          stage: ProjectStage
          gate: GateStatus | null
          feedback_type: FeedbackType
          comment: string
          is_resolved: boolean
          resolved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          stage: ProjectStage
          gate?: GateStatus | null
          feedback_type?: FeedbackType
          comment: string
          is_resolved?: boolean
          resolved_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          stage?: ProjectStage
          gate?: GateStatus | null
          feedback_type?: FeedbackType
          comment?: string
          is_resolved?: boolean
          resolved_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      bi_approvals: {
        Row: {
          id: string
          project_id: string
          gate: GateStatus
          requested_by: string
          requested_at: string
          request_comment: string | null
          approved_by: string | null
          approved_at: string | null
          approval_comment: string | null
          status: ApprovalStatus
          rejection_reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          gate: GateStatus
          requested_by: string
          requested_at?: string
          request_comment?: string | null
          approved_by?: string | null
          approved_at?: string | null
          approval_comment?: string | null
          status?: ApprovalStatus
          rejection_reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          gate?: GateStatus
          requested_by?: string
          requested_at?: string
          request_comment?: string | null
          approved_by?: string | null
          approved_at?: string | null
          approval_comment?: string | null
          status?: ApprovalStatus
          rejection_reason?: string | null
          created_at?: string
        }
        Relationships: []
      }
      bi_prompts: {
        Row: {
          id: string
          key: string
          name: string
          description: string | null
          category: PromptCategory
          system_prompt: string
          user_prompt_template: string
          model: string
          temperature: number
          max_tokens: number
          version: number
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          name: string
          description?: string | null
          category: PromptCategory
          system_prompt: string
          user_prompt_template: string
          model?: string
          temperature?: number
          max_tokens?: number
          version?: number
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          name?: string
          description?: string | null
          category?: PromptCategory
          system_prompt?: string
          user_prompt_template?: string
          model?: string
          temperature?: number
          max_tokens?: number
          version?: number
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bi_prompt_versions: {
        Row: {
          id: string
          prompt_id: string
          version: number
          system_prompt: string
          user_prompt_template: string
          model: string
          temperature: number | null
          max_tokens: number | null
          change_note: string | null
          changed_by: string | null
          created_at: string
          usage_count: number
          avg_rating: number | null
        }
        Insert: {
          id?: string
          prompt_id: string
          version: number
          system_prompt: string
          user_prompt_template: string
          model: string
          temperature?: number | null
          max_tokens?: number | null
          change_note?: string | null
          changed_by?: string | null
          created_at?: string
          usage_count?: number
          avg_rating?: number | null
        }
        Update: {
          id?: string
          prompt_id?: string
          version?: number
          system_prompt?: string
          user_prompt_template?: string
          model?: string
          temperature?: number | null
          max_tokens?: number | null
          change_note?: string | null
          changed_by?: string | null
          created_at?: string
          usage_count?: number
          avg_rating?: number | null
        }
        Relationships: []
      }
      bi_prompt_variables: {
        Row: {
          id: string
          prompt_id: string
          variable_name: string
          description: string | null
          is_required: boolean
          default_value: string | null
          created_at: string
        }
        Insert: {
          id?: string
          prompt_id: string
          variable_name: string
          description?: string | null
          is_required?: boolean
          default_value?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          prompt_id?: string
          variable_name?: string
          description?: string | null
          is_required?: boolean
          default_value?: string | null
          created_at?: string
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
      user_role: UserRole
      locale: Locale
      theme: Theme
      project_status: ProjectStatus
      project_stage: ProjectStage
      gate_status: GateStatus
      document_type: DocumentType
      feedback_type: FeedbackType
      approval_status: ApprovalStatus
      prompt_category: PromptCategory
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// 편의 타입
export type User = Database['public']['Tables']['bi_users']['Row']
export type Project = Database['public']['Tables']['bi_projects']['Row']
export type IdeaCard = Database['public']['Tables']['bi_idea_cards']['Row']
export type Evaluation = Database['public']['Tables']['bi_evaluations']['Row']
export type Document = Database['public']['Tables']['bi_documents']['Row']
export type Feedback = Database['public']['Tables']['bi_feedbacks']['Row']
export type Approval = Database['public']['Tables']['bi_approvals']['Row']
export type Prompt = Database['public']['Tables']['bi_prompts']['Row']
export type PromptVersion = Database['public']['Tables']['bi_prompt_versions']['Row']
export type PromptVariable = Database['public']['Tables']['bi_prompt_variables']['Row']
