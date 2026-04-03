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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      ab_test_results: {
        Row: {
          id: string
          metric_name: string
          metric_value: number
          recorded_at: string
          test_id: string
          user_segment: Json | null
          variant: string
        }
        Insert: {
          id?: string
          metric_name: string
          metric_value: number
          recorded_at?: string
          test_id: string
          user_segment?: Json | null
          variant: string
        }
        Update: {
          id?: string
          metric_name?: string
          metric_value?: number
          recorded_at?: string
          test_id?: string
          user_segment?: Json | null
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "ab_test_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "marketing_ab_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_log: {
        Row: {
          action_details: Json | null
          action_type: string
          admin_user_id: string
          created_at: string
          id: string
          target_user_id: string | null
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          admin_user_id: string
          created_at?: string
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      automated_market_intelligence: {
        Row: {
          competitor_analysis: Json | null
          confidence_score: number | null
          created_at: string
          id: string
          market_sizing: Json | null
          opportunity_id: string
          pricing_research: Json | null
          swot_analysis: Json | null
          trends_analysis: Json | null
          updated_at: string
        }
        Insert: {
          competitor_analysis?: Json | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          market_sizing?: Json | null
          opportunity_id: string
          pricing_research?: Json | null
          swot_analysis?: Json | null
          trends_analysis?: Json | null
          updated_at?: string
        }
        Update: {
          competitor_analysis?: Json | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          market_sizing?: Json | null
          opportunity_id?: string
          pricing_research?: Json | null
          swot_analysis?: Json | null
          trends_analysis?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automated_market_intelligence_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "business_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_executions: {
        Row: {
          completed_at: string | null
          duration_ms: number | null
          error_message: string | null
          execution_results: Json | null
          execution_status: string
          id: string
          started_at: string | null
          trigger_data: Json | null
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          execution_results?: Json | null
          execution_status?: string
          id?: string
          started_at?: string | null
          trigger_data?: Json | null
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          execution_results?: Json | null
          execution_status?: string
          id?: string
          started_at?: string | null
          trigger_data?: Json | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "automation_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_workflows: {
        Row: {
          actions: Json
          created_at: string
          execution_count: number | null
          failure_count: number | null
          id: string
          is_active: boolean | null
          last_execution: string | null
          name: string
          next_execution: string | null
          success_count: number | null
          trigger_conditions: Json | null
          trigger_event: string
          updated_at: string
          workflow_type: string
        }
        Insert: {
          actions: Json
          created_at?: string
          execution_count?: number | null
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_execution?: string | null
          name: string
          next_execution?: string | null
          success_count?: number | null
          trigger_conditions?: Json | null
          trigger_event: string
          updated_at?: string
          workflow_type: string
        }
        Update: {
          actions?: Json
          created_at?: string
          execution_count?: number | null
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_execution?: string | null
          name?: string
          next_execution?: string | null
          success_count?: number | null
          trigger_conditions?: Json | null
          trigger_event?: string
          updated_at?: string
          workflow_type?: string
        }
        Relationships: []
      }
      build_lessons: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_published: boolean | null
          lesson_content: string | null
          opportunity_id: string | null
          slug: string
          sort_order: number | null
          title: string
          track_id: string
          updated_at: string
          video_duration_minutes: number | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean | null
          lesson_content?: string | null
          opportunity_id?: string | null
          slug: string
          sort_order?: number | null
          title: string
          track_id: string
          updated_at?: string
          video_duration_minutes?: number | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean | null
          lesson_content?: string | null
          opportunity_id?: string | null
          slug?: string
          sort_order?: number | null
          title?: string
          track_id?: string
          updated_at?: string
          video_duration_minutes?: number | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "build_lessons_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "build_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      build_tracks: {
        Row: {
          created_at: string
          description: string | null
          difficulty_level: string
          enrollment_count: number | null
          enrollment_enabled: boolean | null
          enrollment_limit: number | null
          estimated_duration_hours: number | null
          featured_image_url: string | null
          id: string
          is_published: boolean | null
          requires_subscription: boolean | null
          slug: string
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          difficulty_level?: string
          enrollment_count?: number | null
          enrollment_enabled?: boolean | null
          enrollment_limit?: number | null
          estimated_duration_hours?: number | null
          featured_image_url?: string | null
          id?: string
          is_published?: boolean | null
          requires_subscription?: boolean | null
          slug: string
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          difficulty_level?: string
          enrollment_count?: number | null
          enrollment_enabled?: boolean | null
          enrollment_limit?: number | null
          estimated_duration_hours?: number | null
          featured_image_url?: string | null
          id?: string
          is_published?: boolean | null
          requires_subscription?: boolean | null
          slug?: string
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      business_opportunities: {
        Row: {
          ai_confidence_score: number | null
          assigned_to: string | null
          competition_level: string | null
          created_at: string | null
          description: string
          difficulty_level: string | null
          founder_fit_score: number | null
          guest_session_id: string | null
          id: string
          is_favorited: boolean | null
          market_size_estimate: string | null
          mvp_generated: boolean | null
          mvp_generated_at: string | null
          mvp_prompt: string | null
          opportunity_tags: string[] | null
          organization_id: string | null
          problem_statement: string
          reddit_analysis: Json | null
          solution_approach: string | null
          source: string | null
          target_market: string
          time_to_market: string | null
          title: string
          updated_at: string | null
          user_id: string | null
          validation_status: string | null
        }
        Insert: {
          ai_confidence_score?: number | null
          assigned_to?: string | null
          competition_level?: string | null
          created_at?: string | null
          description: string
          difficulty_level?: string | null
          founder_fit_score?: number | null
          guest_session_id?: string | null
          id?: string
          is_favorited?: boolean | null
          market_size_estimate?: string | null
          mvp_generated?: boolean | null
          mvp_generated_at?: string | null
          mvp_prompt?: string | null
          opportunity_tags?: string[] | null
          organization_id?: string | null
          problem_statement: string
          reddit_analysis?: Json | null
          solution_approach?: string | null
          source?: string | null
          target_market: string
          time_to_market?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
          validation_status?: string | null
        }
        Update: {
          ai_confidence_score?: number | null
          assigned_to?: string | null
          competition_level?: string | null
          created_at?: string | null
          description?: string
          difficulty_level?: string | null
          founder_fit_score?: number | null
          guest_session_id?: string | null
          id?: string
          is_favorited?: boolean | null
          market_size_estimate?: string | null
          mvp_generated?: boolean | null
          mvp_generated_at?: string | null
          mvp_prompt?: string | null
          opportunity_tags?: string[] | null
          organization_id?: string | null
          problem_statement?: string
          reddit_analysis?: Json | null
          solution_approach?: string | null
          source?: string | null
          target_market?: string
          time_to_market?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_opportunities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_form_submissions: {
        Row: {
          admin_notes: string | null
          company: string | null
          created_at: string
          email: string
          id: string
          ip_address: unknown | null
          message: string
          name: string
          responded_at: string | null
          responded_by: string | null
          status: string
          subject: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          admin_notes?: string | null
          company?: string | null
          created_at?: string
          email: string
          id?: string
          ip_address?: unknown | null
          message: string
          name: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          admin_notes?: string | null
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          ip_address?: unknown | null
          message?: string
          name?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      content_article_tags: {
        Row: {
          article_id: string
          id: string
          tag_id: string
        }
        Insert: {
          article_id: string
          id?: string
          tag_id: string
        }
        Update: {
          article_id?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_article_tags_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "content_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_article_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "content_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      content_articles: {
        Row: {
          author_avatar_url: string | null
          author_name: string
          content: string
          created_at: string
          excerpt: string | null
          featured_image_url: string | null
          id: string
          is_featured: boolean | null
          is_published: boolean | null
          opportunity_id: string | null
          published_at: string | null
          reading_time_minutes: number | null
          requires_subscription: boolean | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          title: string
          updated_at: string
          view_count: number | null
        }
        Insert: {
          author_avatar_url?: string | null
          author_name?: string
          content: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          opportunity_id?: string | null
          published_at?: string | null
          reading_time_minutes?: number | null
          requires_subscription?: boolean | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          title: string
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          author_avatar_url?: string | null
          author_name?: string
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          opportunity_id?: string | null
          published_at?: string | null
          reading_time_minutes?: number | null
          requires_subscription?: boolean | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          title?: string
          updated_at?: string
          view_count?: number | null
        }
        Relationships: []
      }
      content_automation_queue: {
        Row: {
          campaign_id: string | null
          content_id: string | null
          created_at: string
          id: string
          max_retries: number | null
          platform: string
          platform_response: Json | null
          post_data: Json
          retry_count: number | null
          scheduled_time: string
          status: string
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          content_id?: string | null
          created_at?: string
          id?: string
          max_retries?: number | null
          platform: string
          platform_response?: Json | null
          post_data: Json
          retry_count?: number | null
          scheduled_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          content_id?: string | null
          created_at?: string
          id?: string
          max_retries?: number | null
          platform?: string
          platform_response?: Json | null
          post_data?: Json
          retry_count?: number | null
          scheduled_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_automation_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_automation_queue_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "marketing_content"
            referencedColumns: ["id"]
          },
        ]
      }
      content_tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      data_integration_preferences: {
        Row: {
          calendar_integration: boolean | null
          created_at: string | null
          email_integration: boolean | null
          id: string
          messaging_integration: boolean | null
          organization_id: string | null
          spending_integration: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          calendar_integration?: boolean | null
          created_at?: string | null
          email_integration?: boolean | null
          id?: string
          messaging_integration?: boolean | null
          organization_id?: string | null
          spending_integration?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          calendar_integration?: boolean | null
          created_at?: string | null
          email_integration?: boolean | null
          id?: string
          messaging_integration?: boolean | null
          organization_id?: string | null
          spending_integration?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_integration_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_summaries: {
        Row: {
          ai_generated_summary: string | null
          confidence_score: number | null
          created_at: string
          discussion_id: string
          id: string
          is_relevant_for_mvp: boolean | null
          key_pain_points: Json | null
          market_signals: Json | null
          opportunity_id: string
          organization_id: string | null
          proposed_solutions: Json | null
          summary_type: string
          updated_at: string
          user_demographics: Json | null
          user_edited_summary: string | null
          user_id: string
        }
        Insert: {
          ai_generated_summary?: string | null
          confidence_score?: number | null
          created_at?: string
          discussion_id: string
          id?: string
          is_relevant_for_mvp?: boolean | null
          key_pain_points?: Json | null
          market_signals?: Json | null
          opportunity_id: string
          organization_id?: string | null
          proposed_solutions?: Json | null
          summary_type?: string
          updated_at?: string
          user_demographics?: Json | null
          user_edited_summary?: string | null
          user_id: string
        }
        Update: {
          ai_generated_summary?: string | null
          confidence_score?: number | null
          created_at?: string
          discussion_id?: string
          id?: string
          is_relevant_for_mvp?: boolean | null
          key_pain_points?: Json | null
          market_signals?: Json | null
          opportunity_id?: string
          organization_id?: string | null
          proposed_solutions?: Json | null
          summary_type?: string
          updated_at?: string
          user_demographics?: Json | null
          user_edited_summary?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_summaries_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "reddit_discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_channels: {
        Row: {
          audience_size: number | null
          channel_name: string
          channel_type: string
          contact_info: string | null
          content_type: string
          created_at: string
          engagement_rate: number | null
          id: string
          last_placement: string | null
          notes: string | null
          partnership_required: boolean | null
          placement_value: number | null
          posting_frequency: string
          status: string
          updated_at: string
        }
        Insert: {
          audience_size?: number | null
          channel_name: string
          channel_type?: string
          contact_info?: string | null
          content_type?: string
          created_at?: string
          engagement_rate?: number | null
          id?: string
          last_placement?: string | null
          notes?: string | null
          partnership_required?: boolean | null
          placement_value?: number | null
          posting_frequency?: string
          status?: string
          updated_at?: string
        }
        Update: {
          audience_size?: number | null
          channel_name?: string
          channel_type?: string
          contact_info?: string | null
          content_type?: string
          created_at?: string
          engagement_rate?: number | null
          id?: string
          last_placement?: string | null
          notes?: string | null
          partnership_required?: boolean | null
          placement_value?: number | null
          posting_frequency?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_notifications: {
        Row: {
          created_at: string
          delivered_at: string | null
          id: string
          recipient_email: string
          sent_at: string | null
          status: string
          subject: string
          template_type: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          id?: string
          recipient_email: string
          sent_at?: string | null
          status?: string
          subject: string
          template_type: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          id?: string
          recipient_email?: string
          sent_at?: string | null
          status?: string
          subject?: string
          template_type?: string
        }
        Relationships: []
      }
      enterprise_settings: {
        Row: {
          created_at: string
          custom_brand_color: string | null
          custom_domain: string | null
          custom_logo_url: string | null
          id: string
          organization_id: string
          sso_config: Json | null
          sso_enabled: boolean
          sso_provider: string | null
          updated_at: string
          white_label_enabled: boolean
        }
        Insert: {
          created_at?: string
          custom_brand_color?: string | null
          custom_domain?: string | null
          custom_logo_url?: string | null
          id?: string
          organization_id: string
          sso_config?: Json | null
          sso_enabled?: boolean
          sso_provider?: string | null
          updated_at?: string
          white_label_enabled?: boolean
        }
        Update: {
          created_at?: string
          custom_brand_color?: string | null
          custom_domain?: string | null
          custom_logo_url?: string | null
          id?: string
          organization_id?: string
          sso_config?: Json | null
          sso_enabled?: boolean
          sso_provider?: string | null
          updated_at?: string
          white_label_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_gates: {
        Row: {
          created_at: string
          feature_name: string
          id: string
          is_enabled: boolean
          limit_value: number | null
          plan_tier: string
        }
        Insert: {
          created_at?: string
          feature_name: string
          id?: string
          is_enabled?: boolean
          limit_value?: number | null
          plan_tier: string
        }
        Update: {
          created_at?: string
          feature_name?: string
          id?: string
          is_enabled?: boolean
          limit_value?: number | null
          plan_tier?: string
        }
        Relationships: []
      }
      lead_automation_sequences: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          next_action_time: string
          sequence_data: Json | null
          sequence_step: number
          sequence_type: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          next_action_time: string
          sequence_data?: Json | null
          sequence_step?: number
          sequence_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          next_action_time?: string
          sequence_data?: Json | null
          sequence_step?: number
          sequence_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_automation_sequences_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "marketing_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_interactions: {
        Row: {
          created_at: string
          id: string
          interaction_data: Json | null
          interaction_type: string
          lead_id: string | null
          platform: string
        }
        Insert: {
          created_at?: string
          id?: string
          interaction_data?: Json | null
          interaction_type: string
          lead_id?: string | null
          platform: string
        }
        Update: {
          created_at?: string
          id?: string
          interaction_data?: Json | null
          interaction_type?: string
          lead_id?: string | null
          platform?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "marketing_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          lesson_id: string
          progress_percentage: number | null
          track_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          progress_percentage?: number | null
          track_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          progress_percentage?: number | null
          track_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "build_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "build_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      market_cache: {
        Row: {
          access_count: number | null
          cache_key: string
          cached_data: Json
          created_at: string
          expires_at: string
          id: string
          last_accessed: string | null
          organization_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_count?: number | null
          cache_key: string
          cached_data?: Json
          created_at?: string
          expires_at: string
          id?: string
          last_accessed?: string | null
          organization_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_count?: number | null
          cache_key?: string
          cached_data?: Json
          created_at?: string
          expires_at?: string
          id?: string
          last_accessed?: string | null
          organization_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      market_intelligence: {
        Row: {
          competitive_data: Json | null
          confidence_score: number | null
          created_at: string
          customer_feedback: Json | null
          id: string
          intelligence_type: string
          key_insights: Json | null
          market_trends: Json | null
          opportunity_id: string | null
          organization_id: string | null
          source_platform: string
          updated_at: string
          validation_impact: number | null
        }
        Insert: {
          competitive_data?: Json | null
          confidence_score?: number | null
          created_at?: string
          customer_feedback?: Json | null
          id?: string
          intelligence_type: string
          key_insights?: Json | null
          market_trends?: Json | null
          opportunity_id?: string | null
          organization_id?: string | null
          source_platform: string
          updated_at?: string
          validation_impact?: number | null
        }
        Update: {
          competitive_data?: Json | null
          confidence_score?: number | null
          created_at?: string
          customer_feedback?: Json | null
          id?: string
          intelligence_type?: string
          key_insights?: Json | null
          market_trends?: Json | null
          opportunity_id?: string | null
          organization_id?: string | null
          source_platform?: string
          updated_at?: string
          validation_impact?: number | null
        }
        Relationships: []
      }
      marketing_ab_tests: {
        Row: {
          confidence_level: number | null
          created_at: string
          end_date: string | null
          id: string
          results: Json | null
          start_date: string | null
          status: string | null
          test_name: string
          test_type: string
          traffic_split: number | null
          updated_at: string
          variant_a_content: string
          variant_b_content: string
          winner: string | null
        }
        Insert: {
          confidence_level?: number | null
          created_at?: string
          end_date?: string | null
          id?: string
          results?: Json | null
          start_date?: string | null
          status?: string | null
          test_name: string
          test_type: string
          traffic_split?: number | null
          updated_at?: string
          variant_a_content: string
          variant_b_content: string
          winner?: string | null
        }
        Update: {
          confidence_level?: number | null
          created_at?: string
          end_date?: string | null
          id?: string
          results?: Json | null
          start_date?: string | null
          status?: string | null
          test_name?: string
          test_type?: string
          traffic_split?: number | null
          updated_at?: string
          variant_a_content?: string
          variant_b_content?: string
          winner?: string | null
        }
        Relationships: []
      }
      marketing_analytics: {
        Row: {
          campaign_id: string | null
          content_id: string | null
          created_at: string
          date_recorded: string
          id: string
          metadata: Json | null
          metric_name: string
          metric_type: string
          metric_value: number
          platform: string | null
        }
        Insert: {
          campaign_id?: string | null
          content_id?: string | null
          created_at?: string
          date_recorded?: string
          id?: string
          metadata?: Json | null
          metric_name: string
          metric_type: string
          metric_value: number
          platform?: string | null
        }
        Update: {
          campaign_id?: string | null
          content_id?: string | null
          created_at?: string
          date_recorded?: string
          id?: string
          metadata?: Json | null
          metric_name?: string
          metric_type?: string
          metric_value?: number
          platform?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_analytics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_analytics_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "marketing_content"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_automation_rules: {
        Row: {
          action_config: Json
          action_type: string
          created_at: string
          execution_count: number | null
          id: string
          is_active: boolean | null
          last_executed: string | null
          rule_name: string
          trigger_conditions: Json | null
          trigger_event: string
          updated_at: string
        }
        Insert: {
          action_config: Json
          action_type: string
          created_at?: string
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          last_executed?: string | null
          rule_name: string
          trigger_conditions?: Json | null
          trigger_event: string
          updated_at?: string
        }
        Update: {
          action_config?: Json
          action_type?: string
          created_at?: string
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          last_executed?: string | null
          rule_name?: string
          trigger_conditions?: Json | null
          trigger_event?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketing_campaigns: {
        Row: {
          campaign_type: string
          content_themes: string[] | null
          created_at: string
          end_date: string | null
          frequency_settings: Json | null
          id: string
          name: string
          performance_metrics: Json | null
          platforms: string[] | null
          start_date: string | null
          status: string | null
          target_keywords: string[] | null
          updated_at: string
        }
        Insert: {
          campaign_type: string
          content_themes?: string[] | null
          created_at?: string
          end_date?: string | null
          frequency_settings?: Json | null
          id?: string
          name: string
          performance_metrics?: Json | null
          platforms?: string[] | null
          start_date?: string | null
          status?: string | null
          target_keywords?: string[] | null
          updated_at?: string
        }
        Update: {
          campaign_type?: string
          content_themes?: string[] | null
          created_at?: string
          end_date?: string | null
          frequency_settings?: Json | null
          id?: string
          name?: string
          performance_metrics?: Json | null
          platforms?: string[] | null
          start_date?: string | null
          status?: string | null
          target_keywords?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      marketing_content: {
        Row: {
          content: string
          content_type: string
          created_at: string
          engagement_data: Json | null
          error_message: string | null
          generated_by: string | null
          id: string
          platform: string | null
          posted_at: string | null
          published_at: string | null
          scheduled_for: string | null
          status: string | null
          target_audience: Json | null
          template_id: string | null
          updated_at: string
        }
        Insert: {
          content: string
          content_type: string
          created_at?: string
          engagement_data?: Json | null
          error_message?: string | null
          generated_by?: string | null
          id?: string
          platform?: string | null
          posted_at?: string | null
          published_at?: string | null
          scheduled_for?: string | null
          status?: string | null
          target_audience?: Json | null
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          content_type?: string
          created_at?: string
          engagement_data?: Json | null
          error_message?: string | null
          generated_by?: string | null
          id?: string
          platform?: string | null
          posted_at?: string | null
          published_at?: string | null
          scheduled_for?: string | null
          status?: string | null
          target_audience?: Json | null
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_content_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "marketing_content_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_content_queue: {
        Row: {
          content_id: string | null
          created_at: string
          error_message: string | null
          id: string
          next_retry: string | null
          platform: string
          post_id: string | null
          posted_at: string | null
          retry_count: number | null
          scheduled_time: string
          status: string | null
          updated_at: string
        }
        Insert: {
          content_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          next_retry?: string | null
          platform: string
          post_id?: string | null
          posted_at?: string | null
          retry_count?: number | null
          scheduled_time: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          content_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          next_retry?: string | null
          platform?: string
          post_id?: string | null
          posted_at?: string | null
          retry_count?: number | null
          scheduled_time?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_content_queue_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "marketing_content"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_content_templates: {
        Row: {
          content_type: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          platform: string | null
          template_content: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          content_type: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          platform?: string | null
          template_content: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          content_type?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          platform?: string | null
          template_content?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      marketing_leads: {
        Row: {
          assigned_campaign_id: string | null
          contact_info: Json
          conversion_date: string | null
          created_at: string
          engagement_score: number | null
          id: string
          last_interaction: string | null
          lead_data: Json | null
          notes: string | null
          source_platform: string
          source_url: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          assigned_campaign_id?: string | null
          contact_info: Json
          conversion_date?: string | null
          created_at?: string
          engagement_score?: number | null
          id?: string
          last_interaction?: string | null
          lead_data?: Json | null
          notes?: string | null
          source_platform: string
          source_url?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          assigned_campaign_id?: string | null
          contact_info?: Json
          conversion_date?: string | null
          created_at?: string
          engagement_score?: number | null
          id?: string
          last_interaction?: string | null
          lead_data?: Json | null
          notes?: string | null
          source_platform?: string
          source_url?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_leads_assigned_campaign_id_fkey"
            columns: ["assigned_campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_partnerships: {
        Row: {
          collaboration_type: string
          contact_email: string
          created_at: string
          id: string
          next_action_date: string | null
          notes: string | null
          partner_name: string
          partner_type: string
          partnership_value: number | null
          status: string
          updated_at: string
        }
        Insert: {
          collaboration_type?: string
          contact_email: string
          created_at?: string
          id?: string
          next_action_date?: string | null
          notes?: string | null
          partner_name: string
          partner_type?: string
          partnership_value?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          collaboration_type?: string
          contact_email?: string
          created_at?: string
          id?: string
          next_action_date?: string | null
          notes?: string | null
          partner_name?: string
          partner_type?: string
          partnership_value?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketing_projects: {
        Row: {
          budget_allocated: number | null
          created_at: string
          description: string | null
          id: string
          key_metrics: Json | null
          launch_date: string | null
          project_name: string
          project_type: string
          status: string
          target_market: string | null
          team_size: number | null
          updated_at: string
        }
        Insert: {
          budget_allocated?: number | null
          created_at?: string
          description?: string | null
          id?: string
          key_metrics?: Json | null
          launch_date?: string | null
          project_name: string
          project_type?: string
          status?: string
          target_market?: string | null
          team_size?: number | null
          updated_at?: string
        }
        Update: {
          budget_allocated?: number | null
          created_at?: string
          description?: string | null
          id?: string
          key_metrics?: Json | null
          launch_date?: string | null
          project_name?: string
          project_type?: string
          status?: string
          target_market?: string | null
          team_size?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      monitoring_jobs: {
        Row: {
          browse_ai_robot_id: string | null
          created_at: string
          created_by: string
          id: string
          job_name: string
          job_type: string
          last_run_at: string | null
          next_run_at: string | null
          organization_id: string
          schedule_frequency: string
          status: string
          target_urls: string[]
          updated_at: string
        }
        Insert: {
          browse_ai_robot_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          job_name: string
          job_type: string
          last_run_at?: string | null
          next_run_at?: string | null
          organization_id: string
          schedule_frequency?: string
          status?: string
          target_urls: string[]
          updated_at?: string
        }
        Update: {
          browse_ai_robot_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          job_name?: string
          job_type?: string
          last_run_at?: string | null
          next_run_at?: string | null
          organization_id?: string
          schedule_frequency?: string
          status?: string
          target_urls?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      mvp_insights: {
        Row: {
          created_at: string
          id: string
          impact_score: number | null
          implementation_complexity: string | null
          insight_description: string
          insight_title: string
          insight_type: string
          is_included_in_mvp: boolean | null
          opportunity_id: string
          organization_id: string | null
          source_discussion_id: string | null
          source_summary_id: string | null
          supporting_evidence: Json | null
          updated_at: string
          user_validation_count: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          impact_score?: number | null
          implementation_complexity?: string | null
          insight_description: string
          insight_title: string
          insight_type: string
          is_included_in_mvp?: boolean | null
          opportunity_id: string
          organization_id?: string | null
          source_discussion_id?: string | null
          source_summary_id?: string | null
          supporting_evidence?: Json | null
          updated_at?: string
          user_validation_count?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          impact_score?: number | null
          implementation_complexity?: string | null
          insight_description?: string
          insight_title?: string
          insight_type?: string
          is_included_in_mvp?: boolean | null
          opportunity_id?: string
          organization_id?: string | null
          source_discussion_id?: string | null
          source_summary_id?: string | null
          supporting_evidence?: Json | null
          updated_at?: string
          user_validation_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mvp_insights_source_discussion_id_fkey"
            columns: ["source_discussion_id"]
            isOneToOne: false
            referencedRelation: "reddit_discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mvp_insights_source_summary_id_fkey"
            columns: ["source_summary_id"]
            isOneToOne: false
            referencedRelation: "discussion_summaries"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscriptions: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_address: unknown | null
          is_active: boolean
          source: string | null
          subscribed_at: string
          unsubscribe_token: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean
          source?: string | null
          subscribed_at?: string
          unsubscribe_token?: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean
          source?: string | null
          subscribed_at?: string
          unsubscribe_token?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      optimization_suggestions: {
        Row: {
          applied_at: string | null
          confidence_score: number | null
          created_at: string
          id: string
          potential_impact: Json | null
          status: string
          suggested_changes: Json
          suggestion_description: string
          suggestion_title: string
          suggestion_type: string
          target_id: string
          target_type: string
        }
        Insert: {
          applied_at?: string | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          potential_impact?: Json | null
          status?: string
          suggested_changes: Json
          suggestion_description: string
          suggestion_title: string
          suggestion_type: string
          target_id: string
          target_type: string
        }
        Update: {
          applied_at?: string | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          potential_impact?: Json | null
          status?: string
          suggested_changes?: Json
          suggestion_description?: string
          suggestion_title?: string
          suggestion_type?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      organization_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          organization_id: string
          role?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          id: string
          joined_at: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      performance_metrics: {
        Row: {
          id: string
          metadata: Json | null
          metric_name: string
          metric_unit: string
          metric_value: number
          recorded_at: string
        }
        Insert: {
          id?: string
          metadata?: Json | null
          metric_name: string
          metric_unit?: string
          metric_value: number
          recorded_at?: string
        }
        Update: {
          id?: string
          metadata?: Json | null
          metric_name?: string
          metric_unit?: string
          metric_value?: number
          recorded_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          admin_permissions: Json | null
          app_preferences: Json | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email_verified: boolean | null
          first_name: string | null
          full_name: string | null
          id: string
          is_admin: boolean | null
          last_name: string | null
          notification_preferences: Json | null
          onboarding_completed: boolean | null
          privacy_settings: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_permissions?: Json | null
          app_preferences?: Json | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email_verified?: boolean | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          last_name?: string | null
          notification_preferences?: Json | null
          onboarding_completed?: boolean | null
          privacy_settings?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_permissions?: Json | null
          app_preferences?: Json | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email_verified?: boolean | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          last_name?: string | null
          notification_preferences?: Json | null
          onboarding_completed?: boolean | null
          privacy_settings?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reddit_discussions: {
        Row: {
          author: string | null
          created_at: string
          created_utc: number | null
          engagement_metrics: Json | null
          full_content: Json | null
          id: string
          is_marked_for_mvp: boolean | null
          num_comments: number | null
          opportunity_id: string
          organization_id: string | null
          pain_points_extracted: Json | null
          permalink: string | null
          post_id: string
          relevance_score: number | null
          score: number | null
          selftext: string | null
          solutions_mentioned: Json | null
          subreddit: string
          title: string
          top_comments: Json | null
          updated_at: string
          upvote_ratio: number | null
          url: string | null
        }
        Insert: {
          author?: string | null
          created_at?: string
          created_utc?: number | null
          engagement_metrics?: Json | null
          full_content?: Json | null
          id?: string
          is_marked_for_mvp?: boolean | null
          num_comments?: number | null
          opportunity_id: string
          organization_id?: string | null
          pain_points_extracted?: Json | null
          permalink?: string | null
          post_id: string
          relevance_score?: number | null
          score?: number | null
          selftext?: string | null
          solutions_mentioned?: Json | null
          subreddit: string
          title: string
          top_comments?: Json | null
          updated_at?: string
          upvote_ratio?: number | null
          url?: string | null
        }
        Update: {
          author?: string | null
          created_at?: string
          created_utc?: number | null
          engagement_metrics?: Json | null
          full_content?: Json | null
          id?: string
          is_marked_for_mvp?: boolean | null
          num_comments?: number | null
          opportunity_id?: string
          organization_id?: string | null
          pain_points_extracted?: Json | null
          permalink?: string | null
          post_id?: string
          relevance_score?: number | null
          score?: number | null
          selftext?: string | null
          solutions_mentioned?: Json | null
          subreddit?: string
          title?: string
          top_comments?: Json | null
          updated_at?: string
          upvote_ratio?: number | null
          url?: string | null
        }
        Relationships: []
      }
      reddit_queries: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          market_keywords: string
          query_hash: string
          search_results: Json
          subreddits: string[]
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          market_keywords: string
          query_hash: string
          search_results?: Json
          subreddits: string[]
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          market_keywords?: string
          query_hash?: string
          search_results?: Json
          subreddits?: string[]
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          metadata: Json | null
          processed_by: string | null
          reason: string | null
          status: string
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          processed_by?: string | null
          reason?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          processed_by?: string | null
          reason?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      scraped_data: {
        Row: {
          content: Json
          created_at: string
          data_type: string
          id: string
          metadata: Json | null
          opportunity_id: string | null
          organization_id: string | null
          source_type: string
          source_url: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          data_type: string
          id?: string
          metadata?: Json | null
          opportunity_id?: string | null
          organization_id?: string | null
          source_type: string
          source_url: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          data_type?: string
          id?: string
          metadata?: Json | null
          opportunity_id?: string | null
          organization_id?: string | null
          source_type?: string
          source_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          severity: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      subreddit_insights: {
        Row: {
          activity_level: string | null
          created_at: string | null
          id: string
          last_analyzed: string | null
          relevance_score: number | null
          subreddit_name: string
          subscriber_count: number | null
        }
        Insert: {
          activity_level?: string | null
          created_at?: string | null
          id?: string
          last_analyzed?: string | null
          relevance_score?: number | null
          subreddit_name: string
          subscriber_count?: number | null
        }
        Update: {
          activity_level?: string | null
          created_at?: string | null
          id?: string
          last_analyzed?: string | null
          relevance_score?: number | null
          subreddit_name?: string
          subscriber_count?: number | null
        }
        Relationships: []
      }
      subscription_cache: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          is_lifetime: boolean | null
          is_valid: boolean
          organization_id: string | null
          plan_tier: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          is_lifetime?: boolean | null
          is_valid?: boolean
          organization_id?: string | null
          plan_tier?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          is_lifetime?: boolean | null
          is_valid?: boolean
          organization_id?: string | null
          plan_tier?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          is_lifetime: boolean | null
          lifetime_purchase_date: string | null
          lifetime_terms_version: string | null
          organization_id: string | null
          plan_tier: string
          refund_reason: string | null
          refund_status: string | null
          refunded_amount: number | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          is_lifetime?: boolean | null
          lifetime_purchase_date?: string | null
          lifetime_terms_version?: string | null
          organization_id?: string | null
          plan_tier?: string
          refund_reason?: string | null
          refund_status?: string | null
          refunded_amount?: number | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          is_lifetime?: boolean | null
          lifetime_purchase_date?: string | null
          lifetime_terms_version?: string | null
          organization_id?: string | null
          plan_tier?: string
          refund_reason?: string | null
          refund_status?: string | null
          refunded_amount?: number | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      system_announcements: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          message: string
          target_audience: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message: string
          target_audience?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message?: string
          target_audience?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      track_enrollments: {
        Row: {
          completed_at: string | null
          created_at: string
          enrolled_at: string
          id: string
          progress_percentage: number
          track_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          enrolled_at?: string
          id?: string
          progress_percentage?: number
          track_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          enrolled_at?: string
          id?: string
          progress_percentage?: number
          track_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_tracking: {
        Row: {
          count: number
          created_at: string
          id: string
          organization_id: string | null
          period_end: string
          period_start: string
          resource_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          count?: number
          created_at?: string
          id?: string
          organization_id?: string | null
          period_end: string
          period_start: string
          resource_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          count?: number
          created_at?: string
          id?: string
          organization_id?: string | null
          period_end?: string
          period_start?: string
          resource_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_tracking_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_experiences: {
        Row: {
          company: string
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          is_current: boolean | null
          organization_id: string | null
          role: string
          start_date: string | null
          user_id: string
        }
        Insert: {
          company: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          organization_id?: string | null
          role: string
          start_date?: string | null
          user_id: string
        }
        Update: {
          company?: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          organization_id?: string | null
          role?: string
          start_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_experiences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_goals: {
        Row: {
          biggest_frustrations: string[] | null
          created_at: string | null
          current_role: string | null
          experience_level: string | null
          id: string
          industries: string[] | null
          organization_id: string | null
          primary_goal: string | null
          risk_tolerance: string | null
          time_commitment: string | null
          updated_at: string | null
          user_id: string
          venture_interests: string[] | null
        }
        Insert: {
          biggest_frustrations?: string[] | null
          created_at?: string | null
          current_role?: string | null
          experience_level?: string | null
          id?: string
          industries?: string[] | null
          organization_id?: string | null
          primary_goal?: string | null
          risk_tolerance?: string | null
          time_commitment?: string | null
          updated_at?: string | null
          user_id: string
          venture_interests?: string[] | null
        }
        Update: {
          biggest_frustrations?: string[] | null
          created_at?: string | null
          current_role?: string | null
          experience_level?: string | null
          id?: string
          industries?: string[] | null
          organization_id?: string | null
          primary_goal?: string | null
          risk_tolerance?: string | null
          time_commitment?: string | null
          updated_at?: string | null
          user_id?: string
          venture_interests?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "user_goals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_skills: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string | null
          skill_level: string | null
          skill_name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id?: string | null
          skill_level?: string | null
          skill_name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string | null
          skill_level?: string | null
          skill_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_skills_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      validation_task_templates: {
        Row: {
          category: string
          created_at: string
          description: string
          difficulty_level: string | null
          estimated_duration: string | null
          expected_outcomes: string[] | null
          id: string
          instructions: string | null
          name: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          difficulty_level?: string | null
          estimated_duration?: string | null
          expected_outcomes?: string[] | null
          id?: string
          instructions?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          difficulty_level?: string | null
          estimated_duration?: string | null
          expected_outcomes?: string[] | null
          id?: string
          instructions?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      validation_tasks: {
        Row: {
          actual_hours: number | null
          automated_results: Json | null
          automation_status: string | null
          completion_date: string | null
          created_at: string | null
          description: string
          due_date: string | null
          estimated_hours: number | null
          id: string
          is_automated: boolean | null
          notes: string | null
          opportunity_id: string
          priority: string | null
          progress_percentage: number | null
          results: string | null
          status: string | null
          task_type: string
          template_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_hours?: number | null
          automated_results?: Json | null
          automation_status?: string | null
          completion_date?: string | null
          created_at?: string | null
          description: string
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          is_automated?: boolean | null
          notes?: string | null
          opportunity_id: string
          priority?: string | null
          progress_percentage?: number | null
          results?: string | null
          status?: string | null
          task_type: string
          template_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_hours?: number | null
          automated_results?: Json | null
          automation_status?: string | null
          completion_date?: string | null
          created_at?: string | null
          description?: string
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          is_automated?: boolean | null
          notes?: string | null
          opportunity_id?: string
          priority?: string | null
          progress_percentage?: number | null
          results?: string | null
          status?: string | null
          task_type?: string
          template_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "validation_tasks_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "business_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "validation_task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      validation_workflows: {
        Row: {
          automated_recommendation: string | null
          automated_score: number | null
          automated_validation_results: Json | null
          completed_at: string | null
          composite_score: number | null
          created_at: string
          id: string
          last_automated_validation: string | null
          last_signal_at: string | null
          opportunity_id: string
          progress_percentage: number | null
          reddit_validation_results: Json | null
          started_at: string | null
          status: string
          updated_at: string
          workflow_type: string
        }
        Insert: {
          automated_recommendation?: string | null
          automated_score?: number | null
          automated_validation_results?: Json | null
          completed_at?: string | null
          composite_score?: number | null
          created_at?: string
          id?: string
          last_automated_validation?: string | null
          last_signal_at?: string | null
          opportunity_id: string
          progress_percentage?: number | null
          reddit_validation_results?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string
          workflow_type?: string
        }
        Update: {
          automated_recommendation?: string | null
          automated_score?: number | null
          automated_validation_results?: Json | null
          completed_at?: string | null
          composite_score?: number | null
          created_at?: string
          id?: string
          last_automated_validation?: string | null
          last_signal_at?: string | null
          opportunity_id?: string
          progress_percentage?: number | null
          reddit_validation_results?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string
          workflow_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "validation_workflows_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: true
            referencedRelation: "business_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          payload: Json | null
          response_body: string | null
          response_status: number | null
          status: string
          webhook_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          response_body?: string | null
          response_status?: number | null
          status: string
          webhook_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          response_body?: string | null
          response_status?: number | null
          status?: string
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "zapier_webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_activities: {
        Row: {
          activity_data: Json | null
          activity_type: string
          created_at: string
          id: string
          organization_id: string
          user_id: string
        }
        Insert: {
          activity_data?: Json | null
          activity_type: string
          created_at?: string
          id?: string
          organization_id: string
          user_id: string
        }
        Update: {
          activity_data?: Json | null
          activity_type?: string
          created_at?: string
          id?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: []
      }
      workspace_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          inviter_id: string
          organization_id: string
          role: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          inviter_id: string
          organization_id: string
          role?: string
          status?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          inviter_id?: string
          organization_id?: string
          role?: string
          status?: string
          token?: string
        }
        Relationships: []
      }
      zapier_webhooks: {
        Row: {
          created_at: string
          description: string | null
          event_type: string
          id: string
          is_active: boolean
          last_error: string | null
          last_success: string | null
          last_triggered: string | null
          name: string
          organization_id: string | null
          trigger_count: number
          updated_at: string
          user_id: string | null
          webhook_url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_success?: string | null
          last_triggered?: string | null
          name: string
          organization_id?: string | null
          trigger_count?: number
          updated_at?: string
          user_id?: string | null
          webhook_url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_success?: string | null
          last_triggered?: string | null
          name?: string
          organization_id?: string | null
          trigger_count?: number
          updated_at?: string
          user_id?: string | null
          webhook_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_feature_limit: {
        Args: {
          p_feature_name: string
          p_organization_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      claim_guest_opportunities: {
        Args: {
          p_guest_session_id: string
          p_organization_id: string
          p_user_id: string
        }
        Returns: number
      }
      clean_all_user_data: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      cleanup_expired_cache: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_subscription_conflicts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      debug_reddit_discussions_access: {
        Args: { p_opportunity_id: string }
        Returns: Json
      }
      get_opportunities_batch: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_organization_ids: string[]
          p_user_id: string
        }
        Returns: {
          created_at: string
          description: string
          id: string
          is_favorited: boolean
          organization_id: string
          title: string
          validation_status: string
        }[]
      }
      get_or_create_validation_workflow: {
        Args: { p_opportunity_id: string }
        Returns: {
          automated_recommendation: string
          automated_score: number
          automated_validation_results: Json
          completed_at: string
          composite_score: number
          created_at: string
          id: string
          last_automated_validation: string
          last_signal_at: string
          opportunity_id: string
          progress_percentage: number
          reddit_validation_results: Json
          started_at: string
          status: string
          updated_at: string
          workflow_type: string
        }[]
      }
      get_real_usage_count: {
        Args: { p_organization_id: string; p_resource_type: string }
        Returns: number
      }
      get_subscription_status: {
        Args: { p_organization_id?: string; p_user_id: string }
        Returns: {
          from_cache: boolean
          plan_tier: string
          stripe_customer_id: string
          subscribed: boolean
          subscription_end: string
        }[]
      }
      get_subscription_status_lifetime: {
        Args: { p_organization_id?: string; p_user_id: string }
        Returns: {
          from_cache: boolean
          is_lifetime: boolean
          plan_tier: string
          stripe_customer_id: string
          subscribed: boolean
          subscription_end: string
        }[]
      }
      get_subscription_status_optimized: {
        Args: { p_organization_id?: string; p_user_id: string }
        Returns: {
          from_cache: boolean
          plan_tier: string
          stripe_customer_id: string
          subscribed: boolean
          subscription_end: string
        }[]
      }
      get_user_workspace_data: {
        Args: { p_user_id: string }
        Returns: {
          org_created_at: string
          org_id: string
          org_name: string
          org_owner_id: string
          org_slug: string
          org_updated_at: string
          subscription_plan: string
          subscription_status: string
          user_role: string
        }[]
      }
      grant_admin_access: {
        Args: { target_user_id: string }
        Returns: Json
      }
      increment_usage: {
        Args: {
          p_organization_id: string
          p_resource_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      invalidate_subscription_cache: {
        Args: { p_organization_id?: string; p_user_id: string }
        Returns: undefined
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      process_automation_queue: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      process_content_posting_queue: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      process_lead_nurturing: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      setup_support_admin: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_validation_summary: {
        Args: { p_opportunity_id: string }
        Returns: Json
      }
      user_is_organization_member: {
        Args: { org_id: string; user_id: string }
        Returns: boolean
      }
      user_owns_organization: {
        Args: { org_id: string; user_id: string }
        Returns: boolean
      }
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
