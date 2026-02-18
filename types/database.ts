// ============================================================
// Supabase Database Type Definitions
// Generated from schema — update when schema changes
// ============================================================

export type Database = {
  public: {
    Tables: {
      churches: {
        Row: {
          id: string
          name: string
          name_ar: string | null
          country: string
          timezone: string
          primary_language: string
          welcome_message: string | null
          welcome_message_ar: string | null
          visitor_sla_hours: number
          logo_url: string | null
          primary_color: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          name_ar?: string | null
          country?: string
          timezone?: string
          primary_language?: string
          welcome_message?: string | null
          welcome_message_ar?: string | null
          visitor_sla_hours?: number
          logo_url?: string | null
          primary_color?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          name_ar?: string | null
          country?: string
          timezone?: string
          primary_language?: string
          welcome_message?: string | null
          welcome_message_ar?: string | null
          visitor_sla_hours?: number
          logo_url?: string | null
          primary_color?: string
          is_active?: boolean
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          church_id: string
          first_name: string | null
          last_name: string | null
          first_name_ar: string | null
          last_name_ar: string | null
          phone: string | null
          email: string | null
          date_of_birth: string | null
          gender: 'male' | 'female' | null
          occupation: string | null
          occupation_ar: string | null
          photo_url: string | null
          role: 'member' | 'group_leader' | 'ministry_leader' | 'super_admin'
          status: 'active' | 'inactive' | 'at_risk' | 'visitor'
          joined_church_at: string | null
          invited_by: string | null
          notification_pref: 'whatsapp' | 'sms' | 'email' | 'all' | 'none'
          preferred_language: string
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          church_id: string
          first_name?: string | null
          last_name?: string | null
          first_name_ar?: string | null
          last_name_ar?: string | null
          phone?: string | null
          email?: string | null
          date_of_birth?: string | null
          gender?: 'male' | 'female' | null
          occupation?: string | null
          occupation_ar?: string | null
          photo_url?: string | null
          role?: 'member' | 'group_leader' | 'ministry_leader' | 'super_admin'
          status?: 'active' | 'inactive' | 'at_risk' | 'visitor'
          joined_church_at?: string | null
          invited_by?: string | null
          notification_pref?: 'whatsapp' | 'sms' | 'email' | 'all' | 'none'
          preferred_language?: string
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          church_id?: string
          first_name?: string | null
          last_name?: string | null
          first_name_ar?: string | null
          last_name_ar?: string | null
          phone?: string | null
          email?: string | null
          date_of_birth?: string | null
          gender?: 'male' | 'female' | null
          occupation?: string | null
          occupation_ar?: string | null
          photo_url?: string | null
          role?: 'member' | 'group_leader' | 'ministry_leader' | 'super_admin'
          status?: 'active' | 'inactive' | 'at_risk' | 'visitor'
          joined_church_at?: string | null
          invited_by?: string | null
          notification_pref?: 'whatsapp' | 'sms' | 'email' | 'all' | 'none'
          preferred_language?: string
          onboarding_completed?: boolean
          updated_at?: string
        }
      }
      profile_milestones: {
        Row: {
          id: string
          profile_id: string
          church_id: string
          type: 'baptism' | 'salvation' | 'bible_plan_completed' | 'leadership_training' | 'marriage' | 'other'
          title: string
          title_ar: string | null
          date: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          church_id: string
          type?: 'baptism' | 'salvation' | 'bible_plan_completed' | 'leadership_training' | 'marriage' | 'other'
          title: string
          title_ar?: string | null
          date?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          type?: 'baptism' | 'salvation' | 'bible_plan_completed' | 'leadership_training' | 'marriage' | 'other'
          title?: string
          title_ar?: string | null
          date?: string | null
          notes?: string | null
        }
      }
    }
    Views: Record<string, never>
    Functions: {
      church_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      user_role: {
        Args: Record<PropertyKey, never>
        Returns: 'member' | 'group_leader' | 'ministry_leader' | 'super_admin'
      }
    }
    Enums: {
      user_role: 'member' | 'group_leader' | 'ministry_leader' | 'super_admin'
      user_status: 'active' | 'inactive' | 'at_risk' | 'visitor'
      notification_pref: 'whatsapp' | 'sms' | 'email' | 'all' | 'none'
      gender_type: 'male' | 'female'
      milestone_type: 'baptism' | 'salvation' | 'bible_plan_completed' | 'leadership_training' | 'marriage' | 'other'
    }
  }
}
