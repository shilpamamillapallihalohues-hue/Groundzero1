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
      ai_model_registry: {
        Row: {
          config: Json | null
          cost_tier: string
          created_at: string
          display_name: string
          id: string
          is_active: boolean | null
          limitations: string[] | null
          model_id: string
          model_type: string
          provider: string
          speed_tier: string
          strengths: string[] | null
          supported_tasks: string[] | null
          updated_at: string
        }
        Insert: {
          config?: Json | null
          cost_tier?: string
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean | null
          limitations?: string[] | null
          model_id: string
          model_type: string
          provider: string
          speed_tier?: string
          strengths?: string[] | null
          supported_tasks?: string[] | null
          updated_at?: string
        }
        Update: {
          config?: Json | null
          cost_tier?: string
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean | null
          limitations?: string[] | null
          model_id?: string
          model_type?: string
          provider?: string
          speed_tier?: string
          strengths?: string[] | null
          supported_tasks?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_task_definitions: {
        Row: {
          alternative_model_ids: string[] | null
          auto_select_criteria: Json | null
          created_at: string
          description: string | null
          id: string
          recommended_model_ids: string[] | null
          requires_image_gen: boolean | null
          requires_vision: boolean | null
          task_category: string
          task_key: string
          task_name: string
        }
        Insert: {
          alternative_model_ids?: string[] | null
          auto_select_criteria?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          recommended_model_ids?: string[] | null
          requires_image_gen?: boolean | null
          requires_vision?: boolean | null
          task_category: string
          task_key: string
          task_name: string
        }
        Update: {
          alternative_model_ids?: string[] | null
          auto_select_criteria?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          recommended_model_ids?: string[] | null
          requires_image_gen?: boolean | null
          requires_vision?: boolean | null
          task_category?: string
          task_key?: string
          task_name?: string
        }
        Relationships: []
      }
      ai_task_outputs: {
        Row: {
          created_at: string
          created_by: string | null
          error_message: string | null
          execution_time_ms: number | null
          id: string
          input_data: Json | null
          model_id: string
          model_version: string | null
          output_data: Json | null
          parameters: Json | null
          project_id: string | null
          seed: number | null
          status: string | null
          task_key: string
          token_usage: Json | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          input_data?: Json | null
          model_id: string
          model_version?: string | null
          output_data?: Json | null
          parameters?: Json | null
          project_id?: string | null
          seed?: number | null
          status?: string | null
          task_key: string
          token_usage?: Json | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          input_data?: Json | null
          model_id?: string
          model_version?: string | null
          output_data?: Json | null
          parameters?: Json | null
          project_id?: string | null
          seed?: number | null
          status?: string | null
          task_key?: string
          token_usage?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_task_outputs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_task_outputs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_visual_preferences: {
        Row: {
          color_preferences: Json | null
          composition_rules: Json | null
          created_at: string
          director_notes: string | null
          feedback_count: number | null
          generation_history: Json | null
          id: string
          lighting_preferences: Json | null
          preferred_styles: Json | null
          project_id: string
          reference_movies: string[] | null
          rejected_styles: Json | null
          updated_at: string
        }
        Insert: {
          color_preferences?: Json | null
          composition_rules?: Json | null
          created_at?: string
          director_notes?: string | null
          feedback_count?: number | null
          generation_history?: Json | null
          id?: string
          lighting_preferences?: Json | null
          preferred_styles?: Json | null
          project_id: string
          reference_movies?: string[] | null
          rejected_styles?: Json | null
          updated_at?: string
        }
        Update: {
          color_preferences?: Json | null
          composition_rules?: Json | null
          created_at?: string
          director_notes?: string | null
          feedback_count?: number | null
          generation_history?: Json | null
          id?: string
          lighting_preferences?: Json | null
          preferred_styles?: Json | null
          project_id?: string
          reference_movies?: string[] | null
          rejected_styles?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_visual_preferences_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      animatics: {
        Row: {
          audio_track_url: string | null
          created_at: string
          created_by: string | null
          duration_seconds: number | null
          frame_timings: Json | null
          id: string
          project_id: string
          scene_id: string | null
          status: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          audio_track_url?: string | null
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          frame_timings?: Json | null
          id?: string
          project_id: string
          scene_id?: string | null
          status?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          audio_track_url?: string | null
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          frame_timings?: Json | null
          id?: string
          project_id?: string
          scene_id?: string | null
          status?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "animatics_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animatics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animatics_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      animation_handoff_packs: {
        Row: {
          animation_notes: string | null
          concept_art_ids: string[] | null
          created_at: string
          created_by: string | null
          description: string | null
          export_bundle_url: string | null
          exported_at: string | null
          id: string
          known_limitations: string[] | null
          modeling_notes: string | null
          motion_clip_ids: string[] | null
          pack_name: string
          project_id: string
          proxy_model_id: string | null
          reference_image_ids: string[] | null
          rigging_requirements: Json | null
          scene_id: string | null
          shot_ids: string[] | null
          status: string | null
          updated_at: string
        }
        Insert: {
          animation_notes?: string | null
          concept_art_ids?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          export_bundle_url?: string | null
          exported_at?: string | null
          id?: string
          known_limitations?: string[] | null
          modeling_notes?: string | null
          motion_clip_ids?: string[] | null
          pack_name: string
          project_id: string
          proxy_model_id?: string | null
          reference_image_ids?: string[] | null
          rigging_requirements?: Json | null
          scene_id?: string | null
          shot_ids?: string[] | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          animation_notes?: string | null
          concept_art_ids?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          export_bundle_url?: string | null
          exported_at?: string | null
          id?: string
          known_limitations?: string[] | null
          modeling_notes?: string | null
          motion_clip_ids?: string[] | null
          pack_name?: string
          project_id?: string
          proxy_model_id?: string | null
          reference_image_ids?: string[] | null
          rigging_requirements?: Json | null
          scene_id?: string | null
          shot_ids?: string[] | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "animation_handoff_packs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animation_handoff_packs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animation_handoff_packs_proxy_model_id_fkey"
            columns: ["proxy_model_id"]
            isOneToOne: false
            referencedRelation: "proxy_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animation_handoff_packs_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_gates: {
        Row: {
          approval_type: Database["public"]["Enums"]["approval_type"]
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          notes: string | null
          project_id: string
          requested_at: string
          requested_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          revision_count: number
          scene_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approval_type: Database["public"]["Enums"]["approval_type"]
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          notes?: string | null
          project_id: string
          requested_at?: string
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_count?: number
          scene_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approval_type?: Database["public"]["Enums"]["approval_type"]
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          notes?: string | null
          project_id?: string
          requested_at?: string
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_count?: number
          scene_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_gates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_gates_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_gates_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_gates_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_logs: {
        Row: {
          action: string
          approval_id: string
          id: string
          metadata: Json | null
          new_status: string | null
          performed_at: string
          performed_by: string
          previous_status: string | null
        }
        Insert: {
          action: string
          approval_id: string
          id?: string
          metadata?: Json | null
          new_status?: string | null
          performed_at?: string
          performed_by: string
          previous_status?: string | null
        }
        Update: {
          action?: string
          approval_id?: string
          id?: string
          metadata?: Json | null
          new_status?: string | null
          performed_at?: string
          performed_by?: string
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_logs_approval_id_fkey"
            columns: ["approval_id"]
            isOneToOne: false
            referencedRelation: "approvals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_logs_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      approvals: {
        Row: {
          approval_level: string
          approved_at: string | null
          approved_by: string | null
          asset_id: string
          comments: string | null
          created_at: string
          department_id: string | null
          id: string
          status: string
          version_id: string | null
        }
        Insert: {
          approval_level: string
          approved_at?: string | null
          approved_by?: string | null
          asset_id: string
          comments?: string | null
          created_at?: string
          department_id?: string | null
          id?: string
          status?: string
          version_id?: string | null
        }
        Update: {
          approval_level?: string
          approved_at?: string | null
          approved_by?: string | null
          asset_id?: string
          comments?: string | null
          created_at?: string
          department_id?: string | null
          id?: string
          status?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approvals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "production_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "asset_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_comments: {
        Row: {
          asset_id: string
          comment_text: string
          comment_type: string | null
          created_at: string
          id: string
          parent_comment_id: string | null
          updated_at: string
          user_id: string
          version_id: string | null
        }
        Insert: {
          asset_id: string
          comment_text: string
          comment_type?: string | null
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          updated_at?: string
          user_id: string
          version_id?: string | null
        }
        Update: {
          asset_id?: string
          comment_text?: string
          comment_type?: string | null
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          updated_at?: string
          user_id?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_comments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "production_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "asset_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_comments_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "asset_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_department_status: {
        Row: {
          asset_id: string
          assigned_artist_id: string | null
          assigned_at: string | null
          completed_at: string | null
          created_at: string
          current_department: string
          department_order_index: number
          id: string
          project_id: string
          started_at: string | null
          updated_at: string
          workflow_status: string
        }
        Insert: {
          asset_id: string
          assigned_artist_id?: string | null
          assigned_at?: string | null
          completed_at?: string | null
          created_at?: string
          current_department: string
          department_order_index?: number
          id?: string
          project_id: string
          started_at?: string | null
          updated_at?: string
          workflow_status?: string
        }
        Update: {
          asset_id?: string
          assigned_artist_id?: string | null
          assigned_at?: string | null
          completed_at?: string | null
          created_at?: string
          current_department?: string
          department_order_index?: number
          id?: string
          project_id?: string
          started_at?: string | null
          updated_at?: string
          workflow_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_department_status_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: true
            referencedRelation: "production_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_department_status_assigned_artist_id_fkey"
            columns: ["assigned_artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_department_status_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_instances: {
        Row: {
          assigned_artist_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          current_department: string | null
          department_order_index: number | null
          id: string
          instance_name: string | null
          instance_notes: string | null
          library_asset_id: string
          library_version_id: string | null
          project_id: string
          scene_id: string | null
          shot_id: string | null
          started_at: string | null
          updated_at: string
          workflow_status: string | null
        }
        Insert: {
          assigned_artist_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_department?: string | null
          department_order_index?: number | null
          id?: string
          instance_name?: string | null
          instance_notes?: string | null
          library_asset_id: string
          library_version_id?: string | null
          project_id: string
          scene_id?: string | null
          shot_id?: string | null
          started_at?: string | null
          updated_at?: string
          workflow_status?: string | null
        }
        Update: {
          assigned_artist_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_department?: string | null
          department_order_index?: number | null
          id?: string
          instance_name?: string | null
          instance_notes?: string | null
          library_asset_id?: string
          library_version_id?: string | null
          project_id?: string
          scene_id?: string | null
          shot_id?: string | null
          started_at?: string | null
          updated_at?: string
          workflow_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_instances_assigned_artist_id_fkey"
            columns: ["assigned_artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_instances_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_instances_library_asset_id_fkey"
            columns: ["library_asset_id"]
            isOneToOne: false
            referencedRelation: "library_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_instances_library_version_id_fkey"
            columns: ["library_version_id"]
            isOneToOne: false
            referencedRelation: "library_asset_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_instances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_instances_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_reference_links: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          project_id: string
          source_id: string
          source_type: string
          target_id: string | null
          target_name: string
          target_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          project_id: string
          source_id: string
          source_type: string
          target_id?: string | null
          target_name: string
          target_type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          project_id?: string
          source_id?: string
          source_type?: string
          target_id?: string | null
          target_name?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_reference_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_reference_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_review_presentations: {
        Row: {
          annotations: Json | null
          created_at: string
          current_slide: number | null
          description: string | null
          director_notes: string | null
          file_name: string
          file_size_bytes: number | null
          file_type: string | null
          file_url: string
          id: string
          project_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          slide_images: Json | null
          status: string
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          annotations?: Json | null
          created_at?: string
          current_slide?: number | null
          description?: string | null
          director_notes?: string | null
          file_name: string
          file_size_bytes?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          project_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          slide_images?: Json | null
          status?: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          annotations?: Json | null
          created_at?: string
          current_slide?: number | null
          description?: string | null
          director_notes?: string | null
          file_name?: string
          file_size_bytes?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          project_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          slide_images?: Json | null
          status?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_review_presentations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_review_presentations_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_review_presentations_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_routing_history: {
        Row: {
          asset_id: string
          from_department: string | null
          from_department_index: number | null
          id: string
          moved_at: string
          moved_by: string
          to_department: string
          to_department_index: number
        }
        Insert: {
          asset_id: string
          from_department?: string | null
          from_department_index?: number | null
          id?: string
          moved_at?: string
          moved_by?: string
          to_department: string
          to_department_index: number
        }
        Update: {
          asset_id?: string
          from_department?: string | null
          from_department_index?: number | null
          id?: string
          moved_at?: string
          moved_by?: string
          to_department?: string
          to_department_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "asset_routing_history_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "production_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_routing_templates: {
        Row: {
          asset_type: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          routing_order: Json
          updated_at: string
        }
        Insert: {
          asset_type: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          routing_order?: Json
          updated_at?: string
        }
        Update: {
          asset_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          routing_order?: Json
          updated_at?: string
        }
        Relationships: []
      }
      asset_versions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          asset_id: string
          created_at: string
          file_hash: string | null
          file_size_bytes: number | null
          file_url: string | null
          id: string
          is_approved: boolean | null
          metadata: Json | null
          project_id: string
          scene_id: string | null
          thumbnail_url: string | null
          upload_notes: string | null
          uploaded_by: string | null
          version_number: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          asset_id: string
          created_at?: string
          file_hash?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          is_approved?: boolean | null
          metadata?: Json | null
          project_id: string
          scene_id?: string | null
          thumbnail_url?: string | null
          upload_notes?: string | null
          uploaded_by?: string | null
          version_number?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          asset_id?: string
          created_at?: string
          file_hash?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          is_approved?: boolean | null
          metadata?: Json | null
          project_id?: string
          scene_id?: string | null
          thumbnail_url?: string | null
          upload_notes?: string | null
          uploaded_by?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "asset_versions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_versions_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_versions_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          entity_id: string
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          performed_by: string | null
          timestamp: string
          user_agent: string | null
        }
        Insert: {
          action: string
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          performed_by?: string | null
          timestamp?: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          performed_by?: string | null
          timestamp?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_analysis: {
        Row: {
          actual_cost: number | null
          category: string
          created_at: string
          crew_cost: number | null
          equipment_cost: number | null
          estimated_cost: number | null
          id: string
          item_name: string
          location_cost: number | null
          notes: string | null
          project_id: string
          scene_id: string | null
          updated_at: string
          vfx_complexity_multiplier: number | null
        }
        Insert: {
          actual_cost?: number | null
          category: string
          created_at?: string
          crew_cost?: number | null
          equipment_cost?: number | null
          estimated_cost?: number | null
          id?: string
          item_name: string
          location_cost?: number | null
          notes?: string | null
          project_id: string
          scene_id?: string | null
          updated_at?: string
          vfx_complexity_multiplier?: number | null
        }
        Update: {
          actual_cost?: number | null
          category?: string
          created_at?: string
          crew_cost?: number | null
          equipment_cost?: number | null
          estimated_cost?: number | null
          id?: string
          item_name?: string
          location_cost?: number | null
          notes?: string | null
          project_id?: string
          scene_id?: string | null
          updated_at?: string
          vfx_complexity_multiplier?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_analysis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_analysis_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      camera_movements: {
        Row: {
          created_at: string
          direction: string | null
          duration_frames: number | null
          easing: string | null
          end_position: Json | null
          id: string
          movement_type: string
          notes: string | null
          speed: string | null
          start_position: Json | null
          storyboard_id: string
        }
        Insert: {
          created_at?: string
          direction?: string | null
          duration_frames?: number | null
          easing?: string | null
          end_position?: Json | null
          id?: string
          movement_type: string
          notes?: string | null
          speed?: string | null
          start_position?: Json | null
          storyboard_id: string
        }
        Update: {
          created_at?: string
          direction?: string | null
          duration_frames?: number | null
          easing?: string | null
          end_position?: Json | null
          id?: string
          movement_type?: string
          notes?: string | null
          speed?: string | null
          start_position?: Json | null
          storyboard_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "camera_movements_storyboard_id_fkey"
            columns: ["storyboard_id"]
            isOneToOne: false
            referencedRelation: "storyboards"
            referencedColumns: ["id"]
          },
        ]
      }
      character_costumes: {
        Row: {
          accessories: string[] | null
          character_name: string
          color_palette: Json | null
          costume_name: string
          created_at: string
          description: string | null
          id: string
          notes: string | null
          project_id: string
          reference_image_url: string | null
          scene_id: string | null
          updated_at: string
        }
        Insert: {
          accessories?: string[] | null
          character_name: string
          color_palette?: Json | null
          costume_name: string
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          project_id: string
          reference_image_url?: string | null
          scene_id?: string | null
          updated_at?: string
        }
        Update: {
          accessories?: string[] | null
          character_name?: string
          color_palette?: Json | null
          costume_name?: string
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          project_id?: string
          reference_image_url?: string | null
          scene_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_costumes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_costumes_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      character_facial_data: {
        Row: {
          age_range: string | null
          character_name: string
          created_at: string | null
          created_by: string | null
          distinguishing_features: string[] | null
          ethnicity_hints: string | null
          eye_color: string | null
          eye_shape: string | null
          face_shape: string | null
          facial_hair: string | null
          gender: string | null
          generate_expressions: boolean | null
          generated_views: Json | null
          hair_color: string | null
          hair_style: string | null
          id: string
          landmarks_data: Json | null
          lip_shape: string | null
          neutral_background: boolean | null
          nose_type: string | null
          output_format: string | null
          output_resolution: string | null
          project_id: string
          reference_images: Json | null
          skin_tone: string | null
          status: string | null
          stylization: string | null
          updated_at: string | null
        }
        Insert: {
          age_range?: string | null
          character_name: string
          created_at?: string | null
          created_by?: string | null
          distinguishing_features?: string[] | null
          ethnicity_hints?: string | null
          eye_color?: string | null
          eye_shape?: string | null
          face_shape?: string | null
          facial_hair?: string | null
          gender?: string | null
          generate_expressions?: boolean | null
          generated_views?: Json | null
          hair_color?: string | null
          hair_style?: string | null
          id?: string
          landmarks_data?: Json | null
          lip_shape?: string | null
          neutral_background?: boolean | null
          nose_type?: string | null
          output_format?: string | null
          output_resolution?: string | null
          project_id: string
          reference_images?: Json | null
          skin_tone?: string | null
          status?: string | null
          stylization?: string | null
          updated_at?: string | null
        }
        Update: {
          age_range?: string | null
          character_name?: string
          created_at?: string | null
          created_by?: string | null
          distinguishing_features?: string[] | null
          ethnicity_hints?: string | null
          eye_color?: string | null
          eye_shape?: string | null
          face_shape?: string | null
          facial_hair?: string | null
          gender?: string | null
          generate_expressions?: boolean | null
          generated_views?: Json | null
          hair_color?: string | null
          hair_style?: string | null
          id?: string
          landmarks_data?: Json | null
          lip_shape?: string | null
          neutral_background?: boolean | null
          nose_type?: string | null
          output_format?: string | null
          output_resolution?: string | null
          project_id?: string
          reference_images?: Json | null
          skin_tone?: string | null
          status?: string | null
          stylization?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "character_facial_data_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_facial_data_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      character_proxies: {
        Row: {
          age_range: string | null
          body_build: string | null
          complexity_rating: number | null
          costume_reference_ids: string[] | null
          created_at: string
          distinguishing_features: string[] | null
          emotional_tones: Json | null
          ethnicity_hints: string | null
          facial_hair: string | null
          facial_structure: Json | null
          front_view_url: string | null
          gender: string | null
          hair_density: string | null
          hair_style: string | null
          height_reference: string | null
          id: string
          lighting_notes: string | null
          name: string
          neutral_proxy_url: string | null
          project_id: string
          scene_usage: Json | null
          side_view_url: string | null
          source_concept_ids: string[] | null
          status: string | null
          three_quarter_view_url: string | null
          updated_at: string
        }
        Insert: {
          age_range?: string | null
          body_build?: string | null
          complexity_rating?: number | null
          costume_reference_ids?: string[] | null
          created_at?: string
          distinguishing_features?: string[] | null
          emotional_tones?: Json | null
          ethnicity_hints?: string | null
          facial_hair?: string | null
          facial_structure?: Json | null
          front_view_url?: string | null
          gender?: string | null
          hair_density?: string | null
          hair_style?: string | null
          height_reference?: string | null
          id?: string
          lighting_notes?: string | null
          name: string
          neutral_proxy_url?: string | null
          project_id: string
          scene_usage?: Json | null
          side_view_url?: string | null
          source_concept_ids?: string[] | null
          status?: string | null
          three_quarter_view_url?: string | null
          updated_at?: string
        }
        Update: {
          age_range?: string | null
          body_build?: string | null
          complexity_rating?: number | null
          costume_reference_ids?: string[] | null
          created_at?: string
          distinguishing_features?: string[] | null
          emotional_tones?: Json | null
          ethnicity_hints?: string | null
          facial_hair?: string | null
          facial_structure?: Json | null
          front_view_url?: string | null
          gender?: string | null
          hair_density?: string | null
          hair_style?: string | null
          height_reference?: string | null
          id?: string
          lighting_notes?: string | null
          name?: string
          neutral_proxy_url?: string | null
          project_id?: string
          scene_usage?: Json | null
          side_view_url?: string | null
          source_concept_ids?: string[] | null
          status?: string | null
          three_quarter_view_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_proxies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message_reads: {
        Row: {
          id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          message_type: string | null
          metadata: Json | null
          room_id: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          message_type?: string | null
          metadata?: Json | null
          room_id: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          message_type?: string | null
          metadata?: Json | null
          room_id?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_room_participants: {
        Row: {
          id: string
          joined_at: string
          last_read_at: string | null
          role: string | null
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          last_read_at?: string | null
          role?: string | null
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          last_read_at?: string | null
          role?: string | null
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_room_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_room_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          id: string
          name: string
          room_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          name: string
          room_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          name?: string
          room_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_rooms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_rooms_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      client_approvals: {
        Row: {
          asset_id: string | null
          client_id: string
          created_at: string
          decision: string
          id: string
          notes: string | null
          project_id: string
          reviewed_at: string
          scene_id: string | null
          shot_id: string | null
          version_id: string | null
        }
        Insert: {
          asset_id?: string | null
          client_id: string
          created_at?: string
          decision: string
          id?: string
          notes?: string | null
          project_id: string
          reviewed_at?: string
          scene_id?: string | null
          shot_id?: string | null
          version_id?: string | null
        }
        Update: {
          asset_id?: string | null
          client_id?: string
          created_at?: string
          decision?: string
          id?: string
          notes?: string | null
          project_id?: string
          reviewed_at?: string
          scene_id?: string | null
          shot_id?: string | null
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_approvals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_approvals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_approvals_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      client_review_comments: {
        Row: {
          annotation_data: Json | null
          asset_id: string | null
          client_id: string
          comment_text: string
          created_at: string
          frame_number: number | null
          id: string
          project_id: string
          review_session_id: string
          scene_id: string | null
          shot_id: string | null
          status: string | null
          timestamp_marker: number | null
          updated_at: string
          version_id: string | null
        }
        Insert: {
          annotation_data?: Json | null
          asset_id?: string | null
          client_id: string
          comment_text: string
          created_at?: string
          frame_number?: number | null
          id?: string
          project_id: string
          review_session_id: string
          scene_id?: string | null
          shot_id?: string | null
          status?: string | null
          timestamp_marker?: number | null
          updated_at?: string
          version_id?: string | null
        }
        Update: {
          annotation_data?: Json | null
          asset_id?: string | null
          client_id?: string
          comment_text?: string
          created_at?: string
          frame_number?: number | null
          id?: string
          project_id?: string
          review_session_id?: string
          scene_id?: string | null
          shot_id?: string | null
          status?: string | null
          timestamp_marker?: number | null
          updated_at?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_review_comments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_review_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_review_comments_review_session_id_fkey"
            columns: ["review_session_id"]
            isOneToOne: false
            referencedRelation: "client_review_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_review_comments_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      client_review_sessions: {
        Row: {
          asset_id: string | null
          client_id: string
          completed_at: string | null
          created_at: string
          id: string
          project_id: string
          review_type: string
          scene_id: string | null
          shot_id: string | null
          started_at: string
        }
        Insert: {
          asset_id?: string | null
          client_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          project_id: string
          review_type: string
          scene_id?: string | null
          shot_id?: string | null
          started_at?: string
        }
        Update: {
          asset_id?: string | null
          client_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          project_id?: string
          review_type?: string
          scene_id?: string | null
          shot_id?: string | null
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_review_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_review_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_review_sessions_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      collaboration_presence: {
        Row: {
          asset_id: string | null
          cursor_position: Json | null
          id: string
          last_seen_at: string
          page_key: string
          project_id: string
          user_id: string
        }
        Insert: {
          asset_id?: string | null
          cursor_position?: Json | null
          id?: string
          last_seen_at?: string
          page_key: string
          project_id: string
          user_id: string
        }
        Update: {
          asset_id?: string | null
          cursor_position?: Json | null
          id?: string
          last_seen_at?: string
          page_key?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_presence_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaboration_presence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      concept_art_notes: {
        Row: {
          concept_art_id: string
          created_at: string
          created_by: string | null
          id: string
          note_text: string
          project_id: string
          updated_at: string
        }
        Insert: {
          concept_art_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          note_text: string
          project_id: string
          updated_at?: string
        }
        Update: {
          concept_art_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note_text?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "concept_art_notes_concept_art_id_fkey"
            columns: ["concept_art_id"]
            isOneToOne: false
            referencedRelation: "concept_arts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concept_art_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concept_art_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      concept_arts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          art_director_approved: boolean | null
          art_director_approved_at: string | null
          art_director_approved_by: string | null
          art_style: Database["public"]["Enums"]["art_style"]
          branch_name: string | null
          concept_lead_approved: boolean | null
          concept_lead_approved_at: string | null
          concept_lead_approved_by: string | null
          concept_type: Database["public"]["Enums"]["concept_art_type"]
          created_at: string
          created_by: string | null
          description: string | null
          director_approved: boolean | null
          director_approved_at: string | null
          director_approved_by: string | null
          generated_prompt: string | null
          id: string
          image_url: string | null
          is_approved: boolean | null
          is_priority: boolean | null
          metadata: Json | null
          parent_id: string | null
          priority_reason: string | null
          project_id: string
          prompt: string | null
          review_status: string | null
          scene_id: string | null
          seed: number | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          art_director_approved?: boolean | null
          art_director_approved_at?: string | null
          art_director_approved_by?: string | null
          art_style?: Database["public"]["Enums"]["art_style"]
          branch_name?: string | null
          concept_lead_approved?: boolean | null
          concept_lead_approved_at?: string | null
          concept_lead_approved_by?: string | null
          concept_type?: Database["public"]["Enums"]["concept_art_type"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          director_approved?: boolean | null
          director_approved_at?: string | null
          director_approved_by?: string | null
          generated_prompt?: string | null
          id?: string
          image_url?: string | null
          is_approved?: boolean | null
          is_priority?: boolean | null
          metadata?: Json | null
          parent_id?: string | null
          priority_reason?: string | null
          project_id: string
          prompt?: string | null
          review_status?: string | null
          scene_id?: string | null
          seed?: number | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          art_director_approved?: boolean | null
          art_director_approved_at?: string | null
          art_director_approved_by?: string | null
          art_style?: Database["public"]["Enums"]["art_style"]
          branch_name?: string | null
          concept_lead_approved?: boolean | null
          concept_lead_approved_at?: string | null
          concept_lead_approved_by?: string | null
          concept_type?: Database["public"]["Enums"]["concept_art_type"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          director_approved?: boolean | null
          director_approved_at?: string | null
          director_approved_by?: string | null
          generated_prompt?: string | null
          id?: string
          image_url?: string | null
          is_approved?: boolean | null
          is_priority?: boolean | null
          metadata?: Json | null
          parent_id?: string | null
          priority_reason?: string | null
          project_id?: string
          prompt?: string | null
          review_status?: string | null
          scene_id?: string | null
          seed?: number | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "concept_arts_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concept_arts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concept_arts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "concept_arts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concept_arts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concept_arts_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      continuity_checks: {
        Row: {
          ai_analysis: string | null
          check_type: string
          created_at: string
          id: string
          issues_found: Json | null
          project_id: string
          resolved: boolean | null
          resolved_by: string | null
          severity: string | null
          source_storyboard_id: string | null
          target_storyboard_id: string | null
        }
        Insert: {
          ai_analysis?: string | null
          check_type: string
          created_at?: string
          id?: string
          issues_found?: Json | null
          project_id: string
          resolved?: boolean | null
          resolved_by?: string | null
          severity?: string | null
          source_storyboard_id?: string | null
          target_storyboard_id?: string | null
        }
        Update: {
          ai_analysis?: string | null
          check_type?: string
          created_at?: string
          id?: string
          issues_found?: Json | null
          project_id?: string
          resolved?: boolean | null
          resolved_by?: string | null
          severity?: string | null
          source_storyboard_id?: string | null
          target_storyboard_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "continuity_checks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "continuity_checks_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "continuity_checks_source_storyboard_id_fkey"
            columns: ["source_storyboard_id"]
            isOneToOne: false
            referencedRelation: "storyboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "continuity_checks_target_storyboard_id_fkey"
            columns: ["target_storyboard_id"]
            isOneToOne: false
            referencedRelation: "storyboards"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_context_documents: {
        Row: {
          ai_interpretation: string | null
          ai_summary: string | null
          approved_at: string | null
          approved_by: string | null
          asset_name: string | null
          character_name: string | null
          created_at: string
          document_type: Database["public"]["Enums"]["creative_doc_type"]
          file_name: string | null
          file_size_bytes: number | null
          file_type: string | null
          file_url: string | null
          id: string
          is_approved: boolean | null
          is_locked: boolean | null
          location_name: string | null
          locked_at: string | null
          locked_by: string | null
          parent_document_id: string | null
          project_id: string
          raw_content: string | null
          scope: Database["public"]["Enums"]["creative_context_scope"]
          status: string
          title: string
          updated_at: string
          uploaded_by: string | null
          version: number
          world_name: string | null
        }
        Insert: {
          ai_interpretation?: string | null
          ai_summary?: string | null
          approved_at?: string | null
          approved_by?: string | null
          asset_name?: string | null
          character_name?: string | null
          created_at?: string
          document_type?: Database["public"]["Enums"]["creative_doc_type"]
          file_name?: string | null
          file_size_bytes?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_approved?: boolean | null
          is_locked?: boolean | null
          location_name?: string | null
          locked_at?: string | null
          locked_by?: string | null
          parent_document_id?: string | null
          project_id: string
          raw_content?: string | null
          scope?: Database["public"]["Enums"]["creative_context_scope"]
          status?: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
          version?: number
          world_name?: string | null
        }
        Update: {
          ai_interpretation?: string | null
          ai_summary?: string | null
          approved_at?: string | null
          approved_by?: string | null
          asset_name?: string | null
          character_name?: string | null
          created_at?: string
          document_type?: Database["public"]["Enums"]["creative_doc_type"]
          file_name?: string | null
          file_size_bytes?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_approved?: boolean | null
          is_locked?: boolean | null
          location_name?: string | null
          locked_at?: string | null
          locked_by?: string | null
          parent_document_id?: string | null
          project_id?: string
          raw_content?: string | null
          scope?: Database["public"]["Enums"]["creative_context_scope"]
          status?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
          version?: number
          world_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creative_context_documents_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_context_documents_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_context_documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "creative_context_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_context_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_context_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_context_rules: {
        Row: {
          applies_to: string[] | null
          confidence_score: number | null
          created_at: string
          document_id: string
          id: string
          is_mandatory: boolean | null
          priority: number | null
          project_id: string
          rule_description: string
          rule_title: string
          rule_type: string
          scope: Database["public"]["Enums"]["creative_context_scope"]
          source_excerpt: string | null
        }
        Insert: {
          applies_to?: string[] | null
          confidence_score?: number | null
          created_at?: string
          document_id: string
          id?: string
          is_mandatory?: boolean | null
          priority?: number | null
          project_id: string
          rule_description: string
          rule_title: string
          rule_type: string
          scope: Database["public"]["Enums"]["creative_context_scope"]
          source_excerpt?: string | null
        }
        Update: {
          applies_to?: string[] | null
          confidence_score?: number | null
          created_at?: string
          document_id?: string
          id?: string
          is_mandatory?: boolean | null
          priority?: number | null
          project_id?: string
          rule_description?: string
          rule_title?: string
          rule_type?: string
          scope?: Database["public"]["Enums"]["creative_context_scope"]
          source_excerpt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creative_context_rules_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "creative_context_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_context_rules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_context_usage: {
        Row: {
          conflict_details: Json | null
          created_at: string
          document_id: string
          entity_id: string
          entity_type: string
          had_conflicts: boolean | null
          id: string
          prompt_additions: string | null
          rules_applied: string[] | null
        }
        Insert: {
          conflict_details?: Json | null
          created_at?: string
          document_id: string
          entity_id: string
          entity_type: string
          had_conflicts?: boolean | null
          id?: string
          prompt_additions?: string | null
          rules_applied?: string[] | null
        }
        Update: {
          conflict_details?: Json | null
          created_at?: string
          document_id?: string
          entity_id?: string
          entity_type?: string
          had_conflicts?: boolean | null
          id?: string
          prompt_additions?: string | null
          rules_applied?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "creative_context_usage_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "creative_context_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      department_approval_log: {
        Row: {
          approval_type: string
          asset_id: string
          created_at: string
          department: string
          id: string
          notes: string | null
          project_id: string
          reviewer_id: string | null
          status: string
          version_number: number | null
        }
        Insert: {
          approval_type: string
          asset_id: string
          created_at?: string
          department: string
          id?: string
          notes?: string | null
          project_id: string
          reviewer_id?: string | null
          status: string
          version_number?: number | null
        }
        Update: {
          approval_type?: string
          asset_id?: string
          created_at?: string
          department?: string
          id?: string
          notes?: string | null
          project_id?: string
          reviewer_id?: string | null
          status?: string
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "department_approval_log_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "production_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_approval_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_approval_log_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      department_dispatches: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assets_included: string[] | null
          completed_at: string | null
          constraints: Json | null
          context_pack: Json | null
          created_at: string
          department: string
          dispatched_at: string | null
          id: string
          queued_at: string | null
          status: Database["public"]["Enums"]["dispatch_status"]
          storyboard_id: string
          updated_at: string
          visual_references: string[] | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assets_included?: string[] | null
          completed_at?: string | null
          constraints?: Json | null
          context_pack?: Json | null
          created_at?: string
          department: string
          dispatched_at?: string | null
          id?: string
          queued_at?: string | null
          status?: Database["public"]["Enums"]["dispatch_status"]
          storyboard_id: string
          updated_at?: string
          visual_references?: string[] | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assets_included?: string[] | null
          completed_at?: string | null
          constraints?: Json | null
          context_pack?: Json | null
          created_at?: string
          department?: string
          dispatched_at?: string | null
          id?: string
          queued_at?: string | null
          status?: Database["public"]["Enums"]["dispatch_status"]
          storyboard_id?: string
          updated_at?: string
          visual_references?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "department_dispatches_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_dispatches_storyboard_id_fkey"
            columns: ["storyboard_id"]
            isOneToOne: false
            referencedRelation: "storyboards"
            referencedColumns: ["id"]
          },
        ]
      }
      department_members: {
        Row: {
          created_at: string
          department_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department_id: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_members_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      department_reviews: {
        Row: {
          approval_chain: Json | null
          asset_id: string
          asset_type: string
          created_at: string
          department: string
          feedback: string | null
          id: string
          project_id: string
          requested_changes: string[] | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          approval_chain?: Json | null
          asset_id: string
          asset_type: string
          created_at?: string
          department: string
          feedback?: string | null
          id?: string
          project_id: string
          requested_changes?: string[] | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          approval_chain?: Json | null
          asset_id?: string
          asset_type?: string
          created_at?: string
          department?: string
          feedback?: string | null
          id?: string
          project_id?: string
          requested_changes?: string[] | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_reviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          phase: string | null
          team_lead_id: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          phase?: string | null
          team_lead_id?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          phase?: string | null
          team_lead_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_departments_team_lead"
            columns: ["team_lead_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      director_notes: {
        Row: {
          attachments: string[] | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          note_type: string | null
          priority: string | null
          project_id: string
          scene_id: string | null
          storyboard_id: string | null
          timestamp_marker: number | null
          updated_at: string
        }
        Insert: {
          attachments?: string[] | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          note_type?: string | null
          priority?: string | null
          project_id: string
          scene_id?: string | null
          storyboard_id?: string | null
          timestamp_marker?: number | null
          updated_at?: string
        }
        Update: {
          attachments?: string[] | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note_type?: string | null
          priority?: string | null
          project_id?: string
          scene_id?: string | null
          storyboard_id?: string | null
          timestamp_marker?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "director_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "director_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "director_notes_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "director_notes_storyboard_id_fkey"
            columns: ["storyboard_id"]
            isOneToOne: false
            referencedRelation: "storyboards"
            referencedColumns: ["id"]
          },
        ]
      }
      director_personal_notes: {
        Row: {
          color: string | null
          content: string | null
          created_at: string
          id: string
          is_pinned: boolean | null
          project_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          project_id: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          project_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "director_personal_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      discovered_locations: {
        Row: {
          address: string | null
          amenities: string[] | null
          ceiling_height_confidence:
            | Database["public"]["Enums"]["data_confidence"]
            | null
          ceiling_height_ft: number | null
          city: string | null
          contact_info: Json | null
          cost_estimate_per_day: number | null
          country: string | null
          crane_dolly_confidence:
            | Database["public"]["Enums"]["data_confidence"]
            | null
          crane_dolly_feasible: boolean | null
          created_at: string | null
          data_source: string
          drone_allowed: boolean | null
          drone_confidence:
            | Database["public"]["Enums"]["data_confidence"]
            | null
          floor_area_confidence:
            | Database["public"]["Enums"]["data_confidence"]
            | null
          green_screen_confidence:
            | Database["public"]["Enums"]["data_confidence"]
            | null
          green_screen_feasible: boolean | null
          id: string
          indoor_stage_adaptable: boolean | null
          indoor_stage_confidence:
            | Database["public"]["Enums"]["data_confidence"]
            | null
          is_indoor: boolean | null
          is_manually_verified: boolean | null
          led_volume_confidence:
            | Database["public"]["Enums"]["data_confidence"]
            | null
          led_volume_possible: boolean | null
          location_name: string
          location_type: Database["public"]["Enums"]["location_type"]
          multi_camera_confidence:
            | Database["public"]["Enums"]["data_confidence"]
            | null
          multi_camera_feasible: boolean | null
          operating_hours: string | null
          photos: string[] | null
          sound_control_confidence:
            | Database["public"]["Enums"]["data_confidence"]
            | null
          sound_control_level: string | null
          source_name: string | null
          source_url: string | null
          square_footage: number | null
          square_footage_confidence:
            | Database["public"]["Enums"]["data_confidence"]
            | null
          state: string | null
          updated_at: string | null
          usable_floor_area: number | null
          verified_at: string | null
          verified_by: string | null
          vp_readiness_score: number | null
          wide_shot_confidence:
            | Database["public"]["Enums"]["data_confidence"]
            | null
          wide_shot_feasible: boolean | null
        }
        Insert: {
          address?: string | null
          amenities?: string[] | null
          ceiling_height_confidence?:
            | Database["public"]["Enums"]["data_confidence"]
            | null
          ceiling_height_ft?: number | null
          city?: string | null
          contact_info?: Json | null
          cost_estimate_per_day?: number | null
          country?: string | null
          crane_dolly_confidence?:
            | Database["public"]["Enums"]["data_confidence"]
            | null
          crane_dolly_feasible?: boolean | null
          created_at?: string | null
          data_source: string
          drone_allowed?: boolean | null
          drone_confidence?:
            | Database["public"]["Enums"]["data_confidence"]
            | null
          floor_area_confidence?:
            | Database["public"]["Enums"]["data_confidence"]
            | null
          green_screen_confidence?:
            | Database["public"]["Enums"]["data_confidence"]
            | null
          green_screen_feasible?: boolean | null
          id?: string
          indoor_stage_adaptable?: boolean | null
          indoor_stage_confidence?:
            | Database["public"]["Enums"]["data_confidence"]
            | null
          is_indoor?: boolean | null
          is_manually_verified?: boolean | null
          led_volume_confidence?:
            | Database["public"]["Enums"]["data_confidence"]
            | null
          led_volume_possible?: boolean | null
          location_name: string
          location_type?: Database["public"]["Enums"]["location_type"]
          multi_camera_confidence?:
            | Database["public"]["Enums"]["data_confidence"]
            | null
          multi_camera_feasible?: boolean | null
          operating_hours?: string | null
          photos?: string[] | null
          sound_control_confidence?:
            | Database["public"]["Enums"]["data_confidence"]
            | null
          sound_control_level?: string | null
          source_name?: string | null
          source_url?: string | null
          square_footage?: number | null
          square_footage_confidence?:
            | Database["public"]["Enums"]["data_confidence"]
            | null
          state?: string | null
          updated_at?: string | null
          usable_floor_area?: number | null
          verified_at?: string | null
          verified_by?: string | null
          vp_readiness_score?: number | null
          wide_shot_confidence?:
            | Database["public"]["Enums"]["data_confidence"]
            | null
          wide_shot_feasible?: boolean | null
        }
        Update: {
          address?: string | null
          amenities?: string[] | null
          ceiling_height_confidence?:
            | Database["public"]["Enums"]["data_confidence"]
            | null
          ceiling_height_ft?: number | null
          city?: string | null
          contact_info?: Json | null
          cost_estimate_per_day?: number | null
          country?: string | null
          crane_dolly_confidence?:
            | Database["public"]["Enums"]["data_confidence"]
            | null
          crane_dolly_feasible?: boolean | null
          created_at?: string | null
          data_source?: string
          drone_allowed?: boolean | null
          drone_confidence?:
            | Database["public"]["Enums"]["data_confidence"]
            | null
          floor_area_confidence?:
            | Database["public"]["Enums"]["data_confidence"]
            | null
          green_screen_confidence?:
            | Database["public"]["Enums"]["data_confidence"]
            | null
          green_screen_feasible?: boolean | null
          id?: string
          indoor_stage_adaptable?: boolean | null
          indoor_stage_confidence?:
            | Database["public"]["Enums"]["data_confidence"]
            | null
          is_indoor?: boolean | null
          is_manually_verified?: boolean | null
          led_volume_confidence?:
            | Database["public"]["Enums"]["data_confidence"]
            | null
          led_volume_possible?: boolean | null
          location_name?: string
          location_type?: Database["public"]["Enums"]["location_type"]
          multi_camera_confidence?:
            | Database["public"]["Enums"]["data_confidence"]
            | null
          multi_camera_feasible?: boolean | null
          operating_hours?: string | null
          photos?: string[] | null
          sound_control_confidence?:
            | Database["public"]["Enums"]["data_confidence"]
            | null
          sound_control_level?: string | null
          source_name?: string | null
          source_url?: string | null
          square_footage?: number | null
          square_footage_confidence?:
            | Database["public"]["Enums"]["data_confidence"]
            | null
          state?: string | null
          updated_at?: string | null
          usable_floor_area?: number | null
          verified_at?: string | null
          verified_by?: string | null
          vp_readiness_score?: number | null
          wide_shot_confidence?:
            | Database["public"]["Enums"]["data_confidence"]
            | null
          wide_shot_feasible?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "discovered_locations_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          input_data: Json
          job_type: string
          output_data: Json | null
          priority: number
          progress: number
          project_id: string
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          input_data?: Json
          job_type: string
          output_data?: Json | null
          priority?: number
          progress?: number
          project_id: string
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          input_data?: Json
          job_type?: string
          output_data?: Json | null
          priority?: number
          progress?: number
          project_id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      infrastructure_access_rules: {
        Row: {
          can_execute: boolean | null
          can_read: boolean | null
          can_write: boolean | null
          created_at: string
          department_id: string | null
          download_limit_mb: number | null
          id: string
          role: string | null
          rule_type: string
          updated_at: string
          upload_limit_mb: number | null
        }
        Insert: {
          can_execute?: boolean | null
          can_read?: boolean | null
          can_write?: boolean | null
          created_at?: string
          department_id?: string | null
          download_limit_mb?: number | null
          id?: string
          role?: string | null
          rule_type: string
          updated_at?: string
          upload_limit_mb?: number | null
        }
        Update: {
          can_execute?: boolean | null
          can_read?: boolean | null
          can_write?: boolean | null
          created_at?: string
          department_id?: string | null
          download_limit_mb?: number | null
          id?: string
          role?: string | null
          rule_type?: string
          updated_at?: string
          upload_limit_mb?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "infrastructure_access_rules_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      infrastructure_logs: {
        Row: {
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          log_type: string
          message: string
          performed_by: string | null
          severity: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          log_type: string
          message: string
          performed_by?: string | null
          severity: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          log_type?: string
          message?: string
          performed_by?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "infrastructure_logs_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      library_asset_versions: {
        Row: {
          created_at: string
          file_format: string | null
          file_size_bytes: number | null
          file_url: string | null
          id: string
          is_current: boolean | null
          library_asset_id: string
          notes: string | null
          preview_url: string | null
          uploaded_by: string | null
          version_number: number
        }
        Insert: {
          created_at?: string
          file_format?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          is_current?: boolean | null
          library_asset_id: string
          notes?: string | null
          preview_url?: string | null
          uploaded_by?: string | null
          version_number?: number
        }
        Update: {
          created_at?: string
          file_format?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          is_current?: boolean | null
          library_asset_id?: string
          notes?: string | null
          preview_url?: string | null
          uploaded_by?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "library_asset_versions_library_asset_id_fkey"
            columns: ["library_asset_id"]
            isOneToOne: false
            referencedRelation: "library_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_asset_versions_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      library_assets: {
        Row: {
          approval_status:
            | Database["public"]["Enums"]["library_approval_status"]
            | null
          approved_at: string | null
          approved_by: string | null
          asset_type: Database["public"]["Enums"]["library_asset_type"]
          created_at: string
          created_by: string | null
          description: string | null
          global_visibility: boolean | null
          id: string
          metadata: Json | null
          name: string
          owning_department_id: string | null
          pipeline_entry_point: string | null
          source_asset_id: string | null
          source_project_id: string | null
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          approval_status?:
            | Database["public"]["Enums"]["library_approval_status"]
            | null
          approved_at?: string | null
          approved_by?: string | null
          asset_type: Database["public"]["Enums"]["library_asset_type"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          global_visibility?: boolean | null
          id?: string
          metadata?: Json | null
          name: string
          owning_department_id?: string | null
          pipeline_entry_point?: string | null
          source_asset_id?: string | null
          source_project_id?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          approval_status?:
            | Database["public"]["Enums"]["library_approval_status"]
            | null
          approved_at?: string | null
          approved_by?: string | null
          asset_type?: Database["public"]["Enums"]["library_asset_type"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          global_visibility?: boolean | null
          id?: string
          metadata?: Json | null
          name?: string
          owning_department_id?: string | null
          pipeline_entry_point?: string | null
          source_asset_id?: string | null
          source_project_id?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "library_assets_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_assets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_assets_owning_department_id_fkey"
            columns: ["owning_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_assets_source_project_id_fkey"
            columns: ["source_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      library_promotion_requests: {
        Row: {
          created_at: string
          created_library_asset_id: string | null
          id: string
          proposed_department_id: string | null
          proposed_name: string
          proposed_type: Database["public"]["Enums"]["library_asset_type"]
          reason: string | null
          requested_by: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_asset_id: string
          source_project_id: string
          status: string | null
        }
        Insert: {
          created_at?: string
          created_library_asset_id?: string | null
          id?: string
          proposed_department_id?: string | null
          proposed_name: string
          proposed_type: Database["public"]["Enums"]["library_asset_type"]
          reason?: string | null
          requested_by: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_asset_id: string
          source_project_id: string
          status?: string | null
        }
        Update: {
          created_at?: string
          created_library_asset_id?: string | null
          id?: string
          proposed_department_id?: string | null
          proposed_name?: string
          proposed_type?: Database["public"]["Enums"]["library_asset_type"]
          reason?: string | null
          requested_by?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_asset_id?: string
          source_project_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "library_promotion_requests_created_library_asset_id_fkey"
            columns: ["created_library_asset_id"]
            isOneToOne: false
            referencedRelation: "library_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_promotion_requests_proposed_department_id_fkey"
            columns: ["proposed_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_promotion_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_promotion_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_promotion_requests_source_project_id_fkey"
            columns: ["source_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      library_usage_log: {
        Row: {
          action: string | null
          asset_instance_id: string | null
          id: string
          library_asset_id: string
          library_version_id: string | null
          project_id: string
          scene_id: string | null
          shot_id: string | null
          used_at: string
          used_by: string | null
        }
        Insert: {
          action?: string | null
          asset_instance_id?: string | null
          id?: string
          library_asset_id: string
          library_version_id?: string | null
          project_id: string
          scene_id?: string | null
          shot_id?: string | null
          used_at?: string
          used_by?: string | null
        }
        Update: {
          action?: string | null
          asset_instance_id?: string | null
          id?: string
          library_asset_id?: string
          library_version_id?: string | null
          project_id?: string
          scene_id?: string | null
          shot_id?: string | null
          used_at?: string
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "library_usage_log_library_asset_id_fkey"
            columns: ["library_asset_id"]
            isOneToOne: false
            referencedRelation: "library_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_usage_log_library_version_id_fkey"
            columns: ["library_version_id"]
            isOneToOne: false
            referencedRelation: "library_asset_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_usage_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_usage_log_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_usage_log_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lighting_plans: {
        Row: {
          backup_lighting_setup: string | null
          created_at: string
          equipment_needed: string[] | null
          golden_hour_end: string | null
          golden_hour_start: string | null
          id: string
          notes: string | null
          project_id: string
          scene_id: string | null
          shooting_day_id: string | null
          target_time_of_day: string | null
          weather_preference: string | null
        }
        Insert: {
          backup_lighting_setup?: string | null
          created_at?: string
          equipment_needed?: string[] | null
          golden_hour_end?: string | null
          golden_hour_start?: string | null
          id?: string
          notes?: string | null
          project_id: string
          scene_id?: string | null
          shooting_day_id?: string | null
          target_time_of_day?: string | null
          weather_preference?: string | null
        }
        Update: {
          backup_lighting_setup?: string | null
          created_at?: string
          equipment_needed?: string[] | null
          golden_hour_end?: string | null
          golden_hour_start?: string | null
          id?: string
          notes?: string | null
          project_id?: string
          scene_id?: string | null
          shooting_day_id?: string | null
          target_time_of_day?: string | null
          weather_preference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lighting_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lighting_plans_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lighting_plans_shooting_day_id_fkey"
            columns: ["shooting_day_id"]
            isOneToOne: false
            referencedRelation: "shooting_days"
            referencedColumns: ["id"]
          },
        ]
      }
      location_scouting: {
        Row: {
          address: string | null
          availability_notes: string | null
          concept_art_ids: string[] | null
          cons: string[] | null
          coordinates: Json | null
          cost_estimate: number | null
          created_at: string
          created_by: string | null
          id: string
          location_name: string
          match_score: number | null
          project_id: string
          pros: string[] | null
          real_photos: string[] | null
          scene_id: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          availability_notes?: string | null
          concept_art_ids?: string[] | null
          cons?: string[] | null
          coordinates?: Json | null
          cost_estimate?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          location_name: string
          match_score?: number | null
          project_id: string
          pros?: string[] | null
          real_photos?: string[] | null
          scene_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          availability_notes?: string | null
          concept_art_ids?: string[] | null
          cons?: string[] | null
          coordinates?: Json | null
          cost_estimate?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          location_name?: string
          match_score?: number | null
          project_id?: string
          pros?: string[] | null
          real_photos?: string[] | null
          scene_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_scouting_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_scouting_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_scouting_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      location_suggestions: {
        Row: {
          ai_notes: string | null
          camera_movement_score: number | null
          created_at: string | null
          created_by: string | null
          gap_analysis: Json | null
          height_feasibility_score: number | null
          id: string
          location_capabilities: Json | null
          location_id: string | null
          overall_match_score: number
          project_id: string
          rank: number | null
          recommendations: string[] | null
          risk_assumptions: string[] | null
          scene_id: string
          scene_requirements: Json | null
          sound_control_score: number | null
          space_suitability_score: number | null
          status: string | null
          suggestion_type: string
          updated_at: string | null
          vp_readiness_score: number | null
          workarounds: string[] | null
        }
        Insert: {
          ai_notes?: string | null
          camera_movement_score?: number | null
          created_at?: string | null
          created_by?: string | null
          gap_analysis?: Json | null
          height_feasibility_score?: number | null
          id?: string
          location_capabilities?: Json | null
          location_id?: string | null
          overall_match_score?: number
          project_id: string
          rank?: number | null
          recommendations?: string[] | null
          risk_assumptions?: string[] | null
          scene_id: string
          scene_requirements?: Json | null
          sound_control_score?: number | null
          space_suitability_score?: number | null
          status?: string | null
          suggestion_type: string
          updated_at?: string | null
          vp_readiness_score?: number | null
          workarounds?: string[] | null
        }
        Update: {
          ai_notes?: string | null
          camera_movement_score?: number | null
          created_at?: string | null
          created_by?: string | null
          gap_analysis?: Json | null
          height_feasibility_score?: number | null
          id?: string
          location_capabilities?: Json | null
          location_id?: string | null
          overall_match_score?: number
          project_id?: string
          rank?: number | null
          recommendations?: string[] | null
          risk_assumptions?: string[] | null
          scene_id?: string
          scene_requirements?: Json | null
          sound_control_score?: number | null
          space_suitability_score?: number | null
          status?: string | null
          suggestion_type?: string
          updated_at?: string | null
          vp_readiness_score?: number | null
          workarounds?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "location_suggestions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_suggestions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "discovered_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_suggestions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_suggestions_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      look_lock_profiles: {
        Row: {
          camera_contrast: Json | null
          color_palette: Json | null
          created_at: string
          id: string
          is_locked: boolean | null
          lighting_logic: Json | null
          locked_at: string | null
          locked_by: string | null
          material_behavior: Json | null
          name: string
          project_id: string
          scale_proportions: Json | null
          source_concept_ids: string[] | null
          updated_at: string
        }
        Insert: {
          camera_contrast?: Json | null
          color_palette?: Json | null
          created_at?: string
          id?: string
          is_locked?: boolean | null
          lighting_logic?: Json | null
          locked_at?: string | null
          locked_by?: string | null
          material_behavior?: Json | null
          name: string
          project_id: string
          scale_proportions?: Json | null
          source_concept_ids?: string[] | null
          updated_at?: string
        }
        Update: {
          camera_contrast?: Json | null
          color_palette?: Json | null
          created_at?: string
          id?: string
          is_locked?: boolean | null
          lighting_logic?: Json | null
          locked_at?: string | null
          locked_by?: string | null
          material_behavior?: Json | null
          name?: string
          project_id?: string
          scale_proportions?: Json | null
          source_concept_ids?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "look_lock_profiles_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "look_lock_profiles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_locations: {
        Row: {
          address: string | null
          amenities: string[] | null
          approved_at: string | null
          approved_by: string | null
          ceiling_height_ft: number | null
          city: string | null
          contact_info: Json | null
          cost_per_day: number | null
          crane_dolly_feasible: boolean | null
          created_at: string | null
          drone_allowed: boolean | null
          green_screen_feasible: boolean | null
          id: string
          is_indoor: boolean | null
          is_locked: boolean | null
          led_volume_possible: boolean | null
          location_name: string
          location_type: Database["public"]["Enums"]["location_type"]
          multi_camera_feasible: boolean | null
          notes: string | null
          photos: string[] | null
          project_id: string | null
          sound_control_level: string | null
          square_footage: number | null
          state: string | null
          status: string | null
          updated_at: string | null
          uploaded_by: string | null
          usable_floor_area: number | null
          vp_readiness_score: number | null
          wide_shot_feasible: boolean | null
        }
        Insert: {
          address?: string | null
          amenities?: string[] | null
          approved_at?: string | null
          approved_by?: string | null
          ceiling_height_ft?: number | null
          city?: string | null
          contact_info?: Json | null
          cost_per_day?: number | null
          crane_dolly_feasible?: boolean | null
          created_at?: string | null
          drone_allowed?: boolean | null
          green_screen_feasible?: boolean | null
          id?: string
          is_indoor?: boolean | null
          is_locked?: boolean | null
          led_volume_possible?: boolean | null
          location_name: string
          location_type: Database["public"]["Enums"]["location_type"]
          multi_camera_feasible?: boolean | null
          notes?: string | null
          photos?: string[] | null
          project_id?: string | null
          sound_control_level?: string | null
          square_footage?: number | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          usable_floor_area?: number | null
          vp_readiness_score?: number | null
          wide_shot_feasible?: boolean | null
        }
        Update: {
          address?: string | null
          amenities?: string[] | null
          approved_at?: string | null
          approved_by?: string | null
          ceiling_height_ft?: number | null
          city?: string | null
          contact_info?: Json | null
          cost_per_day?: number | null
          crane_dolly_feasible?: boolean | null
          created_at?: string | null
          drone_allowed?: boolean | null
          green_screen_feasible?: boolean | null
          id?: string
          is_indoor?: boolean | null
          is_locked?: boolean | null
          led_volume_possible?: boolean | null
          location_name?: string
          location_type?: Database["public"]["Enums"]["location_type"]
          multi_camera_feasible?: boolean | null
          notes?: string | null
          photos?: string[] | null
          project_id?: string | null
          sound_control_level?: string | null
          square_footage?: number | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          usable_floor_area?: number | null
          vp_readiness_score?: number | null
          wide_shot_feasible?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "manual_locations_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_locations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_locations_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      model_annotations: {
        Row: {
          annotation_text: string
          annotation_type: string | null
          camera_position: Json | null
          color: string | null
          created_at: string
          created_by: string | null
          deliverable_id: string
          id: string
          position_x: number
          position_y: number
          position_z: number
          project_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          annotation_text: string
          annotation_type?: string | null
          camera_position?: Json | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          deliverable_id: string
          id?: string
          position_x?: number
          position_y?: number
          position_z?: number
          project_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          annotation_text?: string
          annotation_type?: string | null
          camera_position?: Json | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          deliverable_id?: string
          id?: string
          position_x?: number
          position_y?: number
          position_z?: number
          project_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_annotations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_annotations_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "project_deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_annotations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_annotations_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      model_plans: {
        Row: {
          ai_generated_proxy_url: string | null
          asset_id: string
          created_at: string
          detail_level: Database["public"]["Enums"]["asset_detail_level"]
          fx_attachment_points: Json | null
          geometry_groups: Json | null
          id: string
          lod_hierarchy: Json | null
          material_slots: string[] | null
          poly_density_guidance: string | null
          rig_layers: string[] | null
          rigging_needs: Json | null
          scale_reference: Json | null
          texture_resolution: string | null
          texture_sets: string[] | null
          topology_suggestions: string[] | null
          updated_at: string
        }
        Insert: {
          ai_generated_proxy_url?: string | null
          asset_id: string
          created_at?: string
          detail_level?: Database["public"]["Enums"]["asset_detail_level"]
          fx_attachment_points?: Json | null
          geometry_groups?: Json | null
          id?: string
          lod_hierarchy?: Json | null
          material_slots?: string[] | null
          poly_density_guidance?: string | null
          rig_layers?: string[] | null
          rigging_needs?: Json | null
          scale_reference?: Json | null
          texture_resolution?: string | null
          texture_sets?: string[] | null
          topology_suggestions?: string[] | null
          updated_at?: string
        }
        Update: {
          ai_generated_proxy_url?: string | null
          asset_id?: string
          created_at?: string
          detail_level?: Database["public"]["Enums"]["asset_detail_level"]
          fx_attachment_points?: Json | null
          geometry_groups?: Json | null
          id?: string
          lod_hierarchy?: Json | null
          material_slots?: string[] | null
          poly_density_guidance?: string | null
          rig_layers?: string[] | null
          rigging_needs?: Json | null
          scale_reference?: Json | null
          texture_resolution?: string | null
          texture_sets?: string[] | null
          topology_suggestions?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_plans_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "production_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      modeling_handoff_packs: {
        Row: {
          asset_id: string | null
          character_proxy_id: string | null
          complexity_rating: number | null
          concept_art_ids: string[] | null
          created_at: string
          created_by: string | null
          exported_at: string | null
          id: string
          material_hints: Json | null
          mesh_groups: Json | null
          modeling_brief: string | null
          pack_name: string
          pack_type: string
          project_id: string
          proxy_model_data: Json | null
          reference_image_ids: string[] | null
          scale_notes: string | null
          status: string | null
          topology_guidance: Json | null
          updated_at: string
        }
        Insert: {
          asset_id?: string | null
          character_proxy_id?: string | null
          complexity_rating?: number | null
          concept_art_ids?: string[] | null
          created_at?: string
          created_by?: string | null
          exported_at?: string | null
          id?: string
          material_hints?: Json | null
          mesh_groups?: Json | null
          modeling_brief?: string | null
          pack_name: string
          pack_type?: string
          project_id: string
          proxy_model_data?: Json | null
          reference_image_ids?: string[] | null
          scale_notes?: string | null
          status?: string | null
          topology_guidance?: Json | null
          updated_at?: string
        }
        Update: {
          asset_id?: string | null
          character_proxy_id?: string | null
          complexity_rating?: number | null
          concept_art_ids?: string[] | null
          created_at?: string
          created_by?: string | null
          exported_at?: string | null
          id?: string
          material_hints?: Json | null
          mesh_groups?: Json | null
          modeling_brief?: string | null
          pack_name?: string
          pack_type?: string
          project_id?: string
          proxy_model_data?: Json | null
          reference_image_ids?: string[] | null
          scale_notes?: string | null
          status?: string | null
          topology_guidance?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modeling_handoff_packs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "production_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modeling_handoff_packs_character_proxy_id_fkey"
            columns: ["character_proxy_id"]
            isOneToOne: false
            referencedRelation: "character_proxies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modeling_handoff_packs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modeling_handoff_packs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      motion_clips: {
        Row: {
          ai_model_used: string | null
          animation_file_urls: Json | null
          approved_at: string | null
          approved_by: string | null
          character_proxy_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_seconds: number | null
          exported_formats:
            | Database["public"]["Enums"]["export_format"][]
            | null
          extraction_params: Json | null
          frame_count: number | null
          has_facial_animation: boolean | null
          id: string
          is_actor_likeness: boolean | null
          known_limitations: string[] | null
          likeness_cleared: boolean | null
          motion_type: string | null
          name: string
          project_id: string
          proxy_model_id: string | null
          reference_video_thumbnail: string | null
          reference_video_url: string | null
          retarget_settings: Json | null
          scene_id: string | null
          skeleton_type: string | null
          status: Database["public"]["Enums"]["motion_clip_status"]
          storyboard_id: string | null
          updated_at: string
          video_frame_range: Json | null
        }
        Insert: {
          ai_model_used?: string | null
          animation_file_urls?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          character_proxy_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          exported_formats?:
            | Database["public"]["Enums"]["export_format"][]
            | null
          extraction_params?: Json | null
          frame_count?: number | null
          has_facial_animation?: boolean | null
          id?: string
          is_actor_likeness?: boolean | null
          known_limitations?: string[] | null
          likeness_cleared?: boolean | null
          motion_type?: string | null
          name: string
          project_id: string
          proxy_model_id?: string | null
          reference_video_thumbnail?: string | null
          reference_video_url?: string | null
          retarget_settings?: Json | null
          scene_id?: string | null
          skeleton_type?: string | null
          status?: Database["public"]["Enums"]["motion_clip_status"]
          storyboard_id?: string | null
          updated_at?: string
          video_frame_range?: Json | null
        }
        Update: {
          ai_model_used?: string | null
          animation_file_urls?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          character_proxy_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          exported_formats?:
            | Database["public"]["Enums"]["export_format"][]
            | null
          extraction_params?: Json | null
          frame_count?: number | null
          has_facial_animation?: boolean | null
          id?: string
          is_actor_likeness?: boolean | null
          known_limitations?: string[] | null
          likeness_cleared?: boolean | null
          motion_type?: string | null
          name?: string
          project_id?: string
          proxy_model_id?: string | null
          reference_video_thumbnail?: string | null
          reference_video_url?: string | null
          retarget_settings?: Json | null
          scene_id?: string | null
          skeleton_type?: string | null
          status?: Database["public"]["Enums"]["motion_clip_status"]
          storyboard_id?: string | null
          updated_at?: string
          video_frame_range?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "motion_clips_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motion_clips_character_proxy_id_fkey"
            columns: ["character_proxy_id"]
            isOneToOne: false
            referencedRelation: "character_proxies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motion_clips_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motion_clips_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motion_clips_proxy_model_id_fkey"
            columns: ["proxy_model_id"]
            isOneToOne: false
            referencedRelation: "proxy_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motion_clips_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motion_clips_storyboard_id_fkey"
            columns: ["storyboard_id"]
            isOneToOne: false
            referencedRelation: "storyboards"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_routing: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          notification_type: string
          source_role: string | null
          target_user_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          notification_type: string
          source_role?: string | null
          target_user_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          notification_type?: string
          source_role?: string | null
          target_user_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_routing_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_routing_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string | null
          read_status: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string | null
          read_status?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string | null
          read_status?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      page_permissions: {
        Row: {
          can_access: boolean
          granted_at: string
          granted_by: string | null
          id: string
          page_key: string
          user_id: string
        }
        Insert: {
          can_access?: boolean
          granted_at?: string
          granted_by?: string | null
          id?: string
          page_key: string
          user_id: string
        }
        Update: {
          can_access?: boolean
          granted_at?: string
          granted_by?: string | null
          id?: string
          page_key?: string
          user_id?: string
        }
        Relationships: []
      }
      pipeline_routing_config: {
        Row: {
          asset_type: string
          created_at: string
          created_by: string | null
          department_order: string[]
          id: string
          is_active: boolean | null
          updated_at: string
        }
        Insert: {
          asset_type: string
          created_at?: string
          created_by?: string | null
          department_order: string[]
          id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Update: {
          asset_type?: string
          created_at?: string
          created_by?: string | null
          department_order?: string[]
          id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_routing_config_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      preprod_approvals: {
        Row: {
          approval_level: string
          created_at: string
          entity_id: string
          entity_type: string
          feedback: string | null
          id: string
          project_id: string
          reviewed_at: string | null
          reviewer_id: string | null
          stage: string
          status: string
        }
        Insert: {
          approval_level: string
          created_at?: string
          entity_id: string
          entity_type: string
          feedback?: string | null
          id?: string
          project_id: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          stage: string
          status?: string
        }
        Update: {
          approval_level?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          feedback?: string | null
          id?: string
          project_id?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          stage?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "preprod_approvals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preprod_approvals_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      preprod_stage_locks: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          locked_at: string | null
          locked_by: string | null
          notes: string | null
          project_id: string
          stage: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          notes?: string | null
          project_id: string
          stage: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          notes?: string | null
          project_id?: string
          stage?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "preprod_stage_locks_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preprod_stage_locks_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preprod_stage_locks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      production_assets: {
        Row: {
          category: Database["public"]["Enums"]["asset_category"]
          complexity_score: number | null
          created_at: string
          created_from: string | null
          current_department_index: number | null
          description: string | null
          id: string
          name: string
          owning_department: string | null
          pipeline_status: string | null
          project_id: string
          reusability_score: number | null
          routing_template_id: string | null
          scene_usage: string[] | null
          shot_usage: string[] | null
          source_concept_id: string | null
          status: string | null
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["asset_category"]
          complexity_score?: number | null
          created_at?: string
          created_from?: string | null
          current_department_index?: number | null
          description?: string | null
          id?: string
          name: string
          owning_department?: string | null
          pipeline_status?: string | null
          project_id: string
          reusability_score?: number | null
          routing_template_id?: string | null
          scene_usage?: string[] | null
          shot_usage?: string[] | null
          source_concept_id?: string | null
          status?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["asset_category"]
          complexity_score?: number | null
          created_at?: string
          created_from?: string | null
          current_department_index?: number | null
          description?: string | null
          id?: string
          name?: string
          owning_department?: string | null
          pipeline_status?: string | null
          project_id?: string
          reusability_score?: number | null
          routing_template_id?: string | null
          scene_usage?: string[] | null
          shot_usage?: string[] | null
          source_concept_id?: string | null
          status?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_assets_routing_template_id_fkey"
            columns: ["routing_template_id"]
            isOneToOne: false
            referencedRelation: "asset_routing_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_assets_source_concept_id_fkey"
            columns: ["source_concept_id"]
            isOneToOne: false
            referencedRelation: "concept_arts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department_id: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          phase: string | null
          role: Database["public"]["Enums"]["user_role"]
          specific_role: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department_id?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          phase?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          specific_role?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department_id?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phase?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          specific_role?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      project_ai_settings: {
        Row: {
          auto_mode: boolean | null
          created_at: string
          default_image_model: string | null
          default_text_model: string | null
          id: string
          image_generation_provider: string | null
          project_id: string
          safety_settings: Json | null
          task_model_overrides: Json | null
          updated_at: string
        }
        Insert: {
          auto_mode?: boolean | null
          created_at?: string
          default_image_model?: string | null
          default_text_model?: string | null
          id?: string
          image_generation_provider?: string | null
          project_id: string
          safety_settings?: Json | null
          task_model_overrides?: Json | null
          updated_at?: string
        }
        Update: {
          auto_mode?: boolean | null
          created_at?: string
          default_image_model?: string | null
          default_text_model?: string | null
          id?: string
          image_generation_provider?: string | null
          project_id?: string
          safety_settings?: Json | null
          task_model_overrides?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_ai_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          can_edit: boolean
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          can_edit?: boolean
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          can_edit?: boolean
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_deliverables: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          asset_type: string
          created_at: string
          created_by: string | null
          department: string
          description: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          metadata: Json | null
          project_id: string
          scene_id: string | null
          status: string
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          asset_type: string
          created_at?: string
          created_by?: string | null
          department: string
          description?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          project_id: string
          scene_id?: string | null
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          asset_type?: string
          created_at?: string
          created_by?: string | null
          department?: string
          description?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string
          scene_id?: string | null
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_deliverables_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_deliverables_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_deliverables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_deliverables_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      project_pipeline_state: {
        Row: {
          animatic_approved: boolean
          animatic_approved_at: string | null
          client_approved: boolean
          client_approved_at: string | null
          concept_approved: boolean
          concept_approved_at: string | null
          created_at: string
          current_stage: Database["public"]["Enums"]["production_stage"]
          id: string
          post_complete: boolean
          post_complete_at: string | null
          production_complete: boolean
          production_complete_at: string | null
          project_id: string
          script_locked: boolean
          script_locked_at: string | null
          script_locked_by: string | null
          storyboard_approved: boolean
          storyboard_approved_at: string | null
          technical_plan_approved: boolean
          technical_plan_approved_at: string | null
          updated_at: string
        }
        Insert: {
          animatic_approved?: boolean
          animatic_approved_at?: string | null
          client_approved?: boolean
          client_approved_at?: string | null
          concept_approved?: boolean
          concept_approved_at?: string | null
          created_at?: string
          current_stage?: Database["public"]["Enums"]["production_stage"]
          id?: string
          post_complete?: boolean
          post_complete_at?: string | null
          production_complete?: boolean
          production_complete_at?: string | null
          project_id: string
          script_locked?: boolean
          script_locked_at?: string | null
          script_locked_by?: string | null
          storyboard_approved?: boolean
          storyboard_approved_at?: string | null
          technical_plan_approved?: boolean
          technical_plan_approved_at?: string | null
          updated_at?: string
        }
        Update: {
          animatic_approved?: boolean
          animatic_approved_at?: string | null
          client_approved?: boolean
          client_approved_at?: string | null
          concept_approved?: boolean
          concept_approved_at?: string | null
          created_at?: string
          current_stage?: Database["public"]["Enums"]["production_stage"]
          id?: string
          post_complete?: boolean
          post_complete_at?: string | null
          production_complete?: boolean
          production_complete_at?: string | null
          project_id?: string
          script_locked?: boolean
          script_locked_at?: string | null
          script_locked_by?: string | null
          storyboard_approved?: boolean
          storyboard_approved_at?: string | null
          technical_plan_approved?: boolean
          technical_plan_approved_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_pipeline_state_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_pipeline_state_script_locked_by_fkey"
            columns: ["script_locked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_storage_mappings: {
        Row: {
          created_at: string
          created_by: string | null
          folder_path: string | null
          id: string
          project_id: string
          storage_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          folder_path?: string | null
          id?: string
          project_id: string
          storage_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          folder_path?: string | null
          id?: string
          project_id?: string
          storage_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_storage_mappings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_storage_mappings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_storage_mappings_storage_id_fkey"
            columns: ["storage_id"]
            isOneToOne: false
            referencedRelation: "storage_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          director_id: string | null
          estimated_budget: number | null
          genre: string | null
          id: string
          producer_id: string | null
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          director_id?: string | null
          estimated_budget?: number | null
          genre?: string | null
          id?: string
          producer_id?: string | null
          status?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          director_id?: string | null
          estimated_budget?: number | null
          genre?: string | null
          id?: string
          producer_id?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_director_id_fkey"
            columns: ["director_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prop_continuity: {
        Row: {
          continuity_notes: string | null
          created_at: string
          description: string | null
          id: string
          issues: Json | null
          project_id: string
          prop_name: string
          reference_image_url: string | null
          scene_appearances: string[] | null
          status: string | null
          updated_at: string
        }
        Insert: {
          continuity_notes?: string | null
          created_at?: string
          description?: string | null
          id?: string
          issues?: Json | null
          project_id: string
          prop_name: string
          reference_image_url?: string | null
          scene_appearances?: string[] | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          continuity_notes?: string | null
          created_at?: string
          description?: string | null
          id?: string
          issues?: Json | null
          project_id?: string
          prop_name?: string
          reference_image_url?: string | null
          scene_appearances?: string[] | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prop_continuity_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      proxy_models: {
        Row: {
          ai_model_used: string | null
          approved_at: string | null
          approved_by: string | null
          asset_id: string | null
          character_proxy_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          exported_formats:
            | Database["public"]["Enums"]["export_format"][]
            | null
          generation_params: Json | null
          has_clean_topology: boolean | null
          id: string
          known_limitations: string[] | null
          model_file_urls: Json | null
          name: string
          orthographic_views: Json | null
          placeholder_materials: Json | null
          poly_count: number | null
          pose_type: string | null
          project_id: string
          scale_reference: Json | null
          source_concept_ids: string[] | null
          source_image_urls: string[] | null
          status: Database["public"]["Enums"]["proxy_model_status"]
          thumbnail_url: string | null
          topology_notes: string | null
          updated_at: string
        }
        Insert: {
          ai_model_used?: string | null
          approved_at?: string | null
          approved_by?: string | null
          asset_id?: string | null
          character_proxy_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          exported_formats?:
            | Database["public"]["Enums"]["export_format"][]
            | null
          generation_params?: Json | null
          has_clean_topology?: boolean | null
          id?: string
          known_limitations?: string[] | null
          model_file_urls?: Json | null
          name: string
          orthographic_views?: Json | null
          placeholder_materials?: Json | null
          poly_count?: number | null
          pose_type?: string | null
          project_id: string
          scale_reference?: Json | null
          source_concept_ids?: string[] | null
          source_image_urls?: string[] | null
          status?: Database["public"]["Enums"]["proxy_model_status"]
          thumbnail_url?: string | null
          topology_notes?: string | null
          updated_at?: string
        }
        Update: {
          ai_model_used?: string | null
          approved_at?: string | null
          approved_by?: string | null
          asset_id?: string | null
          character_proxy_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          exported_formats?:
            | Database["public"]["Enums"]["export_format"][]
            | null
          generation_params?: Json | null
          has_clean_topology?: boolean | null
          id?: string
          known_limitations?: string[] | null
          model_file_urls?: Json | null
          name?: string
          orthographic_views?: Json | null
          placeholder_materials?: Json | null
          poly_count?: number | null
          pose_type?: string | null
          project_id?: string
          scale_reference?: Json | null
          source_concept_ids?: string[] | null
          source_image_urls?: string[] | null
          status?: Database["public"]["Enums"]["proxy_model_status"]
          thumbnail_url?: string | null
          topology_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proxy_models_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proxy_models_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "production_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proxy_models_character_proxy_id_fkey"
            columns: ["character_proxy_id"]
            isOneToOne: false
            referencedRelation: "character_proxies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proxy_models_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proxy_models_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      reference_collection_items: {
        Row: {
          added_at: string | null
          collection_id: string
          id: string
          reference_id: string
          sort_order: number | null
        }
        Insert: {
          added_at?: string | null
          collection_id: string
          id?: string
          reference_id: string
          sort_order?: number | null
        }
        Update: {
          added_at?: string | null
          collection_id?: string
          id?: string
          reference_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reference_collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "reference_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reference_collection_items_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "scene_references"
            referencedColumns: ["id"]
          },
        ]
      }
      reference_collections: {
        Row: {
          collection_type: string | null
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          project_id: string
          updated_at: string | null
        }
        Insert: {
          collection_type?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          project_id: string
          updated_at?: string | null
        }
        Update: {
          collection_type?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          project_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reference_collections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reference_collections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      reference_images: {
        Row: {
          auto_tags: Json | null
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_url: string
          influence_weight: number | null
          lock_color: boolean | null
          lock_composition: boolean | null
          lock_lighting: boolean | null
          project_id: string
          source_type: string
          style_dna: Json | null
          title: string | null
          updated_at: string
        }
        Insert: {
          auto_tags?: Json | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url: string
          influence_weight?: number | null
          lock_color?: boolean | null
          lock_composition?: boolean | null
          lock_lighting?: boolean | null
          project_id: string
          source_type?: string
          style_dna?: Json | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          auto_tags?: Json | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string
          influence_weight?: number | null
          lock_color?: boolean | null
          lock_composition?: boolean | null
          lock_lighting?: boolean | null
          project_id?: string
          source_type?: string
          style_dna?: Json | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reference_images_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reference_images_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      reference_regions: {
        Row: {
          asset_tags: string[] | null
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          label: string
          project_id: string
          reference_id: string
          region_data: Json
          updated_at: string | null
        }
        Insert: {
          asset_tags?: string[] | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          label: string
          project_id: string
          reference_id: string
          region_data: Json
          updated_at?: string | null
        }
        Update: {
          asset_tags?: string[] | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          label?: string
          project_id?: string
          reference_id?: string
          region_data?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reference_regions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reference_regions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reference_regions_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "scene_references"
            referencedColumns: ["id"]
          },
        ]
      }
      reference_searches: {
        Row: {
          asset_id: string | null
          character_proxy_id: string | null
          created_at: string
          id: string
          project_id: string
          results: Json | null
          search_query: string | null
          search_type: string
          selected_references: Json | null
          source_type: string
        }
        Insert: {
          asset_id?: string | null
          character_proxy_id?: string | null
          created_at?: string
          id?: string
          project_id: string
          results?: Json | null
          search_query?: string | null
          search_type?: string
          selected_references?: Json | null
          source_type?: string
        }
        Update: {
          asset_id?: string | null
          character_proxy_id?: string | null
          created_at?: string
          id?: string
          project_id?: string
          results?: Json | null
          search_query?: string | null
          search_type?: string
          selected_references?: Json | null
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reference_searches_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "production_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reference_searches_character_proxy_id_fkey"
            columns: ["character_proxy_id"]
            isOneToOne: false
            referencedRelation: "character_proxies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reference_searches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      render_farm_nodes: {
        Row: {
          cpu_count: number | null
          cpu_usage: number | null
          created_at: string
          disk_usage: number | null
          gpu_count: number | null
          hostname: string | null
          id: string
          ip_address: string
          is_active: boolean | null
          last_heartbeat: string | null
          node_name: string
          os_type: string | null
          ram_usage: number | null
          render_software: string[] | null
          status: string | null
          updated_at: string
        }
        Insert: {
          cpu_count?: number | null
          cpu_usage?: number | null
          created_at?: string
          disk_usage?: number | null
          gpu_count?: number | null
          hostname?: string | null
          id?: string
          ip_address: string
          is_active?: boolean | null
          last_heartbeat?: string | null
          node_name: string
          os_type?: string | null
          ram_usage?: number | null
          render_software?: string[] | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          cpu_count?: number | null
          cpu_usage?: number | null
          created_at?: string
          disk_usage?: number | null
          gpu_count?: number | null
          hostname?: string | null
          id?: string
          ip_address?: string
          is_active?: boolean | null
          last_heartbeat?: string | null
          node_name?: string
          os_type?: string | null
          ram_usage?: number | null
          render_software?: string[] | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      render_queue_settings: {
        Row: {
          department_overrides: Json | null
          id: string
          max_concurrent_jobs: number | null
          priority_rules: Json | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          department_overrides?: Json | null
          id?: string
          max_concurrent_jobs?: number | null
          priority_rules?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          department_overrides?: Json | null
          id?: string
          max_concurrent_jobs?: number | null
          priority_rules?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "render_queue_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rework_cycles: {
        Row: {
          asset_id: string
          created_at: string
          cycle_number: number
          department_id: string | null
          department_name: string | null
          id: string
          reason: string
          resolved_at: string | null
          resolved_by: string | null
          triggered_by: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          cycle_number?: number
          department_id?: string | null
          department_name?: string | null
          id?: string
          reason: string
          resolved_at?: string | null
          resolved_by?: string | null
          triggered_by: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          cycle_number?: number
          department_id?: string | null
          department_name?: string | null
          id?: string
          reason?: string
          resolved_at?: string | null
          resolved_by?: string | null
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "rework_cycles_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "production_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rework_cycles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rework_cycles_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rework_cycles_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scene_assets: {
        Row: {
          actual_delivery_date: string | null
          actual_start_date: string | null
          assigned_artist_id: string | null
          assigned_vendor_id: string | null
          category: string
          concept_approved: boolean
          concept_art_id: string | null
          created_at: string
          current_sector: string | null
          custom_category_name: string | null
          description: string | null
          file_urls: Json | null
          id: string
          name: string
          notes: string | null
          planned_delivery_date: string | null
          planned_start_date: string | null
          production_stage: Database["public"]["Enums"]["production_stage"]
          progress_percentage: number
          project_id: string
          revision_count: number
          scene_id: string
          thumbnail_url: string | null
          updated_at: string
          workflow_status: Database["public"]["Enums"]["asset_workflow_status"]
        }
        Insert: {
          actual_delivery_date?: string | null
          actual_start_date?: string | null
          assigned_artist_id?: string | null
          assigned_vendor_id?: string | null
          category: string
          concept_approved?: boolean
          concept_art_id?: string | null
          created_at?: string
          current_sector?: string | null
          custom_category_name?: string | null
          description?: string | null
          file_urls?: Json | null
          id?: string
          name: string
          notes?: string | null
          planned_delivery_date?: string | null
          planned_start_date?: string | null
          production_stage?: Database["public"]["Enums"]["production_stage"]
          progress_percentage?: number
          project_id: string
          revision_count?: number
          scene_id: string
          thumbnail_url?: string | null
          updated_at?: string
          workflow_status?: Database["public"]["Enums"]["asset_workflow_status"]
        }
        Update: {
          actual_delivery_date?: string | null
          actual_start_date?: string | null
          assigned_artist_id?: string | null
          assigned_vendor_id?: string | null
          category?: string
          concept_approved?: boolean
          concept_art_id?: string | null
          created_at?: string
          current_sector?: string | null
          custom_category_name?: string | null
          description?: string | null
          file_urls?: Json | null
          id?: string
          name?: string
          notes?: string | null
          planned_delivery_date?: string | null
          planned_start_date?: string | null
          production_stage?: Database["public"]["Enums"]["production_stage"]
          progress_percentage?: number
          project_id?: string
          revision_count?: number
          scene_id?: string
          thumbnail_url?: string | null
          updated_at?: string
          workflow_status?: Database["public"]["Enums"]["asset_workflow_status"]
        }
        Relationships: [
          {
            foreignKeyName: "scene_assets_assigned_artist_id_fkey"
            columns: ["assigned_artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_assets_concept_art_id_fkey"
            columns: ["concept_art_id"]
            isOneToOne: false
            referencedRelation: "concept_arts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_assets_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      scene_duration_estimates: {
        Row: {
          action_complexity_score: number | null
          ai_estimated_seconds: number | null
          created_at: string
          dialogue_word_count: number | null
          id: string
          manual_estimated_seconds: number | null
          notes: string | null
          scene_id: string
          updated_at: string
        }
        Insert: {
          action_complexity_score?: number | null
          ai_estimated_seconds?: number | null
          created_at?: string
          dialogue_word_count?: number | null
          id?: string
          manual_estimated_seconds?: number | null
          notes?: string | null
          scene_id: string
          updated_at?: string
        }
        Update: {
          action_complexity_score?: number | null
          ai_estimated_seconds?: number | null
          created_at?: string
          dialogue_word_count?: number | null
          id?: string
          manual_estimated_seconds?: number | null
          notes?: string | null
          scene_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scene_duration_estimates_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      scene_references: {
        Row: {
          asset_tags: string[] | null
          category: string
          collection_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_url: string
          project_id: string
          reference_type: string | null
          scene_id: string | null
          source_type: string
          title: string | null
          updated_at: string
        }
        Insert: {
          asset_tags?: string[] | null
          category?: string
          collection_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url: string
          project_id: string
          reference_type?: string | null
          scene_id?: string | null
          source_type?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          asset_tags?: string[] | null
          category?: string
          collection_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string
          project_id?: string
          reference_type?: string | null
          scene_id?: string | null
          source_type?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scene_references_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "reference_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_references_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_references_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_references_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      scenes: {
        Row: {
          ai_generated: boolean | null
          animation_cost_estimate: number | null
          assigned_departments: string[] | null
          beat_tag: string | null
          camera_directions: string[] | null
          characters: string[] | null
          costumes: string[] | null
          created_at: string
          description: string | null
          estimated_duration: number | null
          human_edited: boolean | null
          id: string
          is_locked: boolean | null
          live_action_cost_estimate: number | null
          location: string | null
          locked_at: string | null
          locked_by: string | null
          page_end: number | null
          page_start: number | null
          production_method: string | null
          project_id: string
          props: string[] | null
          recommended_method: string | null
          review_status: string | null
          scene_number: string
          script_version_id: string | null
          slugline: string
          sound_cues: string[] | null
          status: string
          time_of_day: string | null
          updated_at: string
          vfx_breakdown: Json | null
          vfx_complexity: string | null
          vfx_elements: string[] | null
          vfx_notes: string | null
          vfx_required: boolean | null
        }
        Insert: {
          ai_generated?: boolean | null
          animation_cost_estimate?: number | null
          assigned_departments?: string[] | null
          beat_tag?: string | null
          camera_directions?: string[] | null
          characters?: string[] | null
          costumes?: string[] | null
          created_at?: string
          description?: string | null
          estimated_duration?: number | null
          human_edited?: boolean | null
          id?: string
          is_locked?: boolean | null
          live_action_cost_estimate?: number | null
          location?: string | null
          locked_at?: string | null
          locked_by?: string | null
          page_end?: number | null
          page_start?: number | null
          production_method?: string | null
          project_id: string
          props?: string[] | null
          recommended_method?: string | null
          review_status?: string | null
          scene_number: string
          script_version_id?: string | null
          slugline: string
          sound_cues?: string[] | null
          status?: string
          time_of_day?: string | null
          updated_at?: string
          vfx_breakdown?: Json | null
          vfx_complexity?: string | null
          vfx_elements?: string[] | null
          vfx_notes?: string | null
          vfx_required?: boolean | null
        }
        Update: {
          ai_generated?: boolean | null
          animation_cost_estimate?: number | null
          assigned_departments?: string[] | null
          beat_tag?: string | null
          camera_directions?: string[] | null
          characters?: string[] | null
          costumes?: string[] | null
          created_at?: string
          description?: string | null
          estimated_duration?: number | null
          human_edited?: boolean | null
          id?: string
          is_locked?: boolean | null
          live_action_cost_estimate?: number | null
          location?: string | null
          locked_at?: string | null
          locked_by?: string | null
          page_end?: number | null
          page_start?: number | null
          production_method?: string | null
          project_id?: string
          props?: string[] | null
          recommended_method?: string | null
          review_status?: string | null
          scene_number?: string
          script_version_id?: string | null
          slugline?: string
          sound_cues?: string[] | null
          status?: string
          time_of_day?: string | null
          updated_at?: string
          vfx_breakdown?: Json | null
          vfx_complexity?: string | null
          vfx_elements?: string[] | null
          vfx_notes?: string | null
          vfx_required?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "scenes_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenes_script_version_id_fkey"
            columns: ["script_version_id"]
            isOneToOne: false
            referencedRelation: "script_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      screenplay_comments: {
        Row: {
          comment_text: string
          comment_type: string | null
          created_at: string | null
          element_id: string | null
          id: string
          is_resolved: boolean | null
          project_id: string
          resolved_at: string | null
          resolved_by: string | null
          scene_id: string | null
          script_version_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment_text: string
          comment_type?: string | null
          created_at?: string | null
          element_id?: string | null
          id?: string
          is_resolved?: boolean | null
          project_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          scene_id?: string | null
          script_version_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment_text?: string
          comment_type?: string | null
          created_at?: string | null
          element_id?: string | null
          id?: string
          is_resolved?: boolean | null
          project_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          scene_id?: string | null
          script_version_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "screenplay_comments_element_id_fkey"
            columns: ["element_id"]
            isOneToOne: false
            referencedRelation: "screenplay_elements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screenplay_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screenplay_comments_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screenplay_comments_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screenplay_comments_script_version_id_fkey"
            columns: ["script_version_id"]
            isOneToOne: false
            referencedRelation: "script_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screenplay_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      screenplay_elements: {
        Row: {
          character_name: string | null
          content: string
          created_at: string | null
          element_type: string
          id: string
          metadata: Json | null
          order_index: number
          page_number: number | null
          scene_id: string | null
          script_version_id: string
          updated_at: string | null
        }
        Insert: {
          character_name?: string | null
          content: string
          created_at?: string | null
          element_type: string
          id?: string
          metadata?: Json | null
          order_index: number
          page_number?: number | null
          scene_id?: string | null
          script_version_id: string
          updated_at?: string | null
        }
        Update: {
          character_name?: string | null
          content?: string
          created_at?: string | null
          element_type?: string
          id?: string
          metadata?: Json | null
          order_index?: number
          page_number?: number | null
          scene_id?: string | null
          script_version_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "screenplay_elements_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screenplay_elements_script_version_id_fkey"
            columns: ["script_version_id"]
            isOneToOne: false
            referencedRelation: "script_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      script_translations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          original_content: string | null
          project_id: string
          source_language: string
          status: string | null
          target_language: string
          translated_content: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          original_content?: string | null
          project_id: string
          source_language?: string
          status?: string | null
          target_language: string
          translated_content?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          original_content?: string | null
          project_id?: string
          source_language?: string
          status?: string | null
          target_language?: string
          translated_content?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "script_translations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_translations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      script_versions: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          beat_structure: Json | null
          changes_summary: string | null
          content: string | null
          created_at: string
          created_by: string | null
          estimated_runtime_minutes: number | null
          file_type: string | null
          file_url: string | null
          id: string
          is_locked: boolean | null
          locked_at: string | null
          locked_by: string | null
          page_count: number | null
          project_id: string
          submitted_at: string | null
          submitted_by: string | null
          title: string
          version_number: number
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          beat_structure?: Json | null
          changes_summary?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          estimated_runtime_minutes?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_locked?: boolean | null
          locked_at?: string | null
          locked_by?: string | null
          page_count?: number | null
          project_id: string
          submitted_at?: string | null
          submitted_by?: string | null
          title: string
          version_number?: number
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          beat_structure?: Json | null
          changes_summary?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          estimated_runtime_minutes?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_locked?: boolean | null
          locked_at?: string | null
          locked_by?: string | null
          page_count?: number | null
          project_id?: string
          submitted_at?: string | null
          submitted_by?: string | null
          title?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "script_versions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_versions_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_versions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sector_routing: {
        Row: {
          asset_category: string
          created_at: string
          department_id: string | null
          estimated_days: number | null
          id: string
          is_required: boolean
          sector_name: string
          sector_order: number
        }
        Insert: {
          asset_category: string
          created_at?: string
          department_id?: string | null
          estimated_days?: number | null
          id?: string
          is_required?: boolean
          sector_name: string
          sector_order: number
        }
        Update: {
          asset_category?: string
          created_at?: string
          department_id?: string | null
          estimated_days?: number | null
          id?: string
          is_required?: boolean
          sector_name?: string
          sector_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "sector_routing_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      shooting_days: {
        Row: {
          call_time: string | null
          cast_required: string[] | null
          created_at: string
          crew_notes: string | null
          day_number: number
          id: string
          location: string | null
          scene_ids: string[] | null
          schedule_id: string
          shoot_date: string | null
          status: string | null
          weather_backup_plan: string | null
          wrap_time: string | null
        }
        Insert: {
          call_time?: string | null
          cast_required?: string[] | null
          created_at?: string
          crew_notes?: string | null
          day_number: number
          id?: string
          location?: string | null
          scene_ids?: string[] | null
          schedule_id: string
          shoot_date?: string | null
          status?: string | null
          weather_backup_plan?: string | null
          wrap_time?: string | null
        }
        Update: {
          call_time?: string | null
          cast_required?: string[] | null
          created_at?: string
          crew_notes?: string | null
          day_number?: number
          id?: string
          location?: string | null
          scene_ids?: string[] | null
          schedule_id?: string
          shoot_date?: string | null
          status?: string | null
          weather_backup_plan?: string | null
          wrap_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shooting_days_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "shooting_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      shooting_schedules: {
        Row: {
          ai_suggestions: Json | null
          created_at: string
          created_by: string | null
          end_date: string | null
          id: string
          optimization_notes: string | null
          project_id: string
          schedule_data: Json | null
          start_date: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          ai_suggestions?: Json | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          optimization_notes?: string | null
          project_id: string
          schedule_data?: Json | null
          start_date?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          ai_suggestions?: Json | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          optimization_notes?: string | null
          project_id?: string
          schedule_data?: Json | null
          start_date?: string | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shooting_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shooting_schedules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      shot_assets: {
        Row: {
          asset_id: string
          created_at: string
          fx_notes: string | null
          id: string
          is_required: boolean | null
          lighting_notes: string | null
          look_lock_profile_id: string | null
          storyboard_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          fx_notes?: string | null
          id?: string
          is_required?: boolean | null
          lighting_notes?: string | null
          look_lock_profile_id?: string | null
          storyboard_id: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          fx_notes?: string | null
          id?: string
          is_required?: boolean | null
          lighting_notes?: string | null
          look_lock_profile_id?: string | null
          storyboard_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shot_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "production_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shot_assets_look_lock_profile_id_fkey"
            columns: ["look_lock_profile_id"]
            isOneToOne: false
            referencedRelation: "look_lock_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shot_assets_storyboard_id_fkey"
            columns: ["storyboard_id"]
            isOneToOne: false
            referencedRelation: "storyboards"
            referencedColumns: ["id"]
          },
        ]
      }
      shot_lists: {
        Row: {
          created_at: string
          created_by: string | null
          export_format: string | null
          export_url: string | null
          exported_at: string | null
          id: string
          project_id: string
          scene_id: string | null
          shots_data: Json | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          export_format?: string | null
          export_url?: string | null
          exported_at?: string | null
          id?: string
          project_id: string
          scene_id?: string | null
          shots_data?: Json | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          export_format?: string | null
          export_url?: string | null
          exported_at?: string | null
          id?: string
          project_id?: string
          scene_id?: string | null
          shots_data?: Json | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "shot_lists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shot_lists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shot_lists_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      shot_notes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note_text: string
          project_id: string
          storyboard_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note_text: string
          project_id: string
          storyboard_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note_text?: string
          project_id?: string
          storyboard_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shot_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shot_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shot_notes_storyboard_id_fkey"
            columns: ["storyboard_id"]
            isOneToOne: false
            referencedRelation: "storyboards"
            referencedColumns: ["id"]
          },
        ]
      }
      shot_readiness: {
        Row: {
          ai_recommendations: string | null
          animation_difficulty_score: number | null
          asset_readiness_pct: number | null
          calculated_at: string | null
          created_at: string
          fx_complexity_score: number | null
          id: string
          lighting_cost_score: number | null
          missing_assets: string[] | null
          overall_status: string | null
          risk_flags: string[] | null
          storyboard_id: string
          updated_at: string
        }
        Insert: {
          ai_recommendations?: string | null
          animation_difficulty_score?: number | null
          asset_readiness_pct?: number | null
          calculated_at?: string | null
          created_at?: string
          fx_complexity_score?: number | null
          id?: string
          lighting_cost_score?: number | null
          missing_assets?: string[] | null
          overall_status?: string | null
          risk_flags?: string[] | null
          storyboard_id: string
          updated_at?: string
        }
        Update: {
          ai_recommendations?: string | null
          animation_difficulty_score?: number | null
          asset_readiness_pct?: number | null
          calculated_at?: string | null
          created_at?: string
          fx_complexity_score?: number | null
          id?: string
          lighting_cost_score?: number | null
          missing_assets?: string[] | null
          overall_status?: string | null
          risk_flags?: string[] | null
          storyboard_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shot_readiness_storyboard_id_fkey"
            columns: ["storyboard_id"]
            isOneToOne: true
            referencedRelation: "storyboards"
            referencedColumns: ["id"]
          },
        ]
      }
      shot_risk_analysis: {
        Row: {
          ai_recommendations: string | null
          camera_complexity_risk:
            | Database["public"]["Enums"]["risk_level"]
            | null
          cost_risk: Database["public"]["Enums"]["risk_level"] | null
          created_at: string
          estimated_cost_impact: number | null
          flagged_issues: string[] | null
          id: string
          mitigation_suggestions: string[] | null
          overall_risk: Database["public"]["Enums"]["risk_level"]
          risk_factors: Json | null
          scene_id: string
          storyboard_id: string | null
          updated_at: string
          vfx_complexity_risk: Database["public"]["Enums"]["risk_level"] | null
        }
        Insert: {
          ai_recommendations?: string | null
          camera_complexity_risk?:
            | Database["public"]["Enums"]["risk_level"]
            | null
          cost_risk?: Database["public"]["Enums"]["risk_level"] | null
          created_at?: string
          estimated_cost_impact?: number | null
          flagged_issues?: string[] | null
          id?: string
          mitigation_suggestions?: string[] | null
          overall_risk?: Database["public"]["Enums"]["risk_level"]
          risk_factors?: Json | null
          scene_id: string
          storyboard_id?: string | null
          updated_at?: string
          vfx_complexity_risk?: Database["public"]["Enums"]["risk_level"] | null
        }
        Update: {
          ai_recommendations?: string | null
          camera_complexity_risk?:
            | Database["public"]["Enums"]["risk_level"]
            | null
          cost_risk?: Database["public"]["Enums"]["risk_level"] | null
          created_at?: string
          estimated_cost_impact?: number | null
          flagged_issues?: string[] | null
          id?: string
          mitigation_suggestions?: string[] | null
          overall_risk?: Database["public"]["Enums"]["risk_level"]
          risk_factors?: Json | null
          scene_id?: string
          storyboard_id?: string | null
          updated_at?: string
          vfx_complexity_risk?: Database["public"]["Enums"]["risk_level"] | null
        }
        Relationships: [
          {
            foreignKeyName: "shot_risk_analysis_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shot_risk_analysis_storyboard_id_fkey"
            columns: ["storyboard_id"]
            isOneToOne: false
            referencedRelation: "storyboards"
            referencedColumns: ["id"]
          },
        ]
      }
      shots: {
        Row: {
          created_at: string
          frame_end: number | null
          frame_start: number | null
          id: string
          project_id: string
          scene_id: string
          shot_code: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          frame_end?: number | null
          frame_start?: number | null
          id?: string
          project_id: string
          scene_id: string
          shot_code: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          frame_end?: number | null
          frame_start?: number | null
          id?: string
          project_id?: string
          scene_id?: string
          shot_code?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shots_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_transition_log: {
        Row: {
          created_at: string
          from_stage: Database["public"]["Enums"]["production_stage"] | null
          id: string
          metadata: Json | null
          project_id: string
          to_stage: Database["public"]["Enums"]["production_stage"]
          trigger_reason: string
          triggered_by: string | null
        }
        Insert: {
          created_at?: string
          from_stage?: Database["public"]["Enums"]["production_stage"] | null
          id?: string
          metadata?: Json | null
          project_id: string
          to_stage: Database["public"]["Enums"]["production_stage"]
          trigger_reason: string
          triggered_by?: string | null
        }
        Update: {
          created_at?: string
          from_stage?: Database["public"]["Enums"]["production_stage"] | null
          id?: string
          metadata?: Json | null
          project_id?: string
          to_stage?: Database["public"]["Enums"]["production_stage"]
          trigger_reason?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stage_transition_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_transition_log_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_configurations: {
        Row: {
          access_key_encrypted: string | null
          base_path: string | null
          bucket_name: string | null
          cloud_provider: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          last_test_status: string | null
          last_tested_at: string | null
          mount_path: string | null
          protocol: string | null
          region: string | null
          secret_key_encrypted: string | null
          storage_name: string
          storage_type: string
          updated_at: string
          username: string | null
        }
        Insert: {
          access_key_encrypted?: string | null
          base_path?: string | null
          bucket_name?: string | null
          cloud_provider?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          last_test_status?: string | null
          last_tested_at?: string | null
          mount_path?: string | null
          protocol?: string | null
          region?: string | null
          secret_key_encrypted?: string | null
          storage_name: string
          storage_type: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          access_key_encrypted?: string | null
          base_path?: string | null
          bucket_name?: string | null
          cloud_provider?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          last_test_status?: string | null
          last_tested_at?: string | null
          mount_path?: string | null
          protocol?: string | null
          region?: string | null
          secret_key_encrypted?: string | null
          storage_name?: string
          storage_type?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storage_configurations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      storyboard_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          position_x: number | null
          position_y: number | null
          storyboard_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          position_x?: number | null
          position_y?: number | null
          storyboard_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          position_x?: number | null
          position_y?: number | null
          storyboard_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storyboard_comments_storyboard_id_fkey"
            columns: ["storyboard_id"]
            isOneToOne: false
            referencedRelation: "storyboards"
            referencedColumns: ["id"]
          },
        ]
      }
      storyboards: {
        Row: {
          action: string | null
          ai_generated: boolean | null
          animation_cost_estimate: number | null
          camera_angle: string | null
          created_at: string
          human_edited: boolean | null
          id: string
          image_url: string | null
          lens_focal_length: string | null
          lens_type: string | null
          lighting: string | null
          lighting_mood: string | null
          lighting_setup: string | null
          live_action_cost_estimate: number | null
          mood: string | null
          production_method: string | null
          prompt: string | null
          recommended_method: string | null
          review_status: string | null
          scene_id: string
          shot_locked: boolean | null
          shot_number: string
          shot_order: number | null
          shot_type: string | null
          sort_order: number | null
          status: string
          updated_at: string
          version: number
          vfx_complexity: string | null
          vfx_elements: string[] | null
          vfx_notes: string | null
          vfx_required: boolean | null
        }
        Insert: {
          action?: string | null
          ai_generated?: boolean | null
          animation_cost_estimate?: number | null
          camera_angle?: string | null
          created_at?: string
          human_edited?: boolean | null
          id?: string
          image_url?: string | null
          lens_focal_length?: string | null
          lens_type?: string | null
          lighting?: string | null
          lighting_mood?: string | null
          lighting_setup?: string | null
          live_action_cost_estimate?: number | null
          mood?: string | null
          production_method?: string | null
          prompt?: string | null
          recommended_method?: string | null
          review_status?: string | null
          scene_id: string
          shot_locked?: boolean | null
          shot_number: string
          shot_order?: number | null
          shot_type?: string | null
          sort_order?: number | null
          status?: string
          updated_at?: string
          version?: number
          vfx_complexity?: string | null
          vfx_elements?: string[] | null
          vfx_notes?: string | null
          vfx_required?: boolean | null
        }
        Update: {
          action?: string | null
          ai_generated?: boolean | null
          animation_cost_estimate?: number | null
          camera_angle?: string | null
          created_at?: string
          human_edited?: boolean | null
          id?: string
          image_url?: string | null
          lens_focal_length?: string | null
          lens_type?: string | null
          lighting?: string | null
          lighting_mood?: string | null
          lighting_setup?: string | null
          live_action_cost_estimate?: number | null
          mood?: string | null
          production_method?: string | null
          prompt?: string | null
          recommended_method?: string | null
          review_status?: string | null
          scene_id?: string
          shot_locked?: boolean | null
          shot_number?: string
          shot_order?: number | null
          shot_type?: string | null
          sort_order?: number | null
          status?: string
          updated_at?: string
          version?: number
          vfx_complexity?: string | null
          vfx_elements?: string[] | null
          vfx_notes?: string | null
          vfx_required?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "storyboards_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      style_presets: {
        Row: {
          camera_style: string | null
          color_grading: Json | null
          created_at: string
          created_by: string | null
          id: string
          is_global: boolean | null
          lighting_style: string | null
          name: string
          project_id: string | null
          reference_movie: string | null
          style_parameters: Json | null
        }
        Insert: {
          camera_style?: string | null
          color_grading?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_global?: boolean | null
          lighting_style?: string | null
          name: string
          project_id?: string | null
          reference_movie?: string | null
          style_parameters?: Json | null
        }
        Update: {
          camera_style?: string | null
          color_grading?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_global?: boolean | null
          lighting_style?: string | null
          name?: string
          project_id?: string | null
          reference_movie?: string | null
          style_parameters?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "style_presets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "style_presets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          department: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          project_id: string
          scene_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          department: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          project_id: string
          scene_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          department?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          project_id?: string
          scene_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
        }
        Relationships: []
      }
      technical_plans: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          estimated_crew_size: number | null
          estimated_duration_days: number | null
          fx_complexity: string | null
          id: string
          is_approved: boolean
          motion_capture_required: boolean | null
          notes: string | null
          production_type: string | null
          project_id: string
          render_time_estimate: string | null
          scene_id: string | null
          simulation_feasibility: string | null
          software_stack: Json | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          estimated_crew_size?: number | null
          estimated_duration_days?: number | null
          fx_complexity?: string | null
          id?: string
          is_approved?: boolean
          motion_capture_required?: boolean | null
          notes?: string | null
          production_type?: string | null
          project_id: string
          render_time_estimate?: string | null
          scene_id?: string | null
          simulation_feasibility?: string | null
          software_stack?: Json | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          estimated_crew_size?: number | null
          estimated_duration_days?: number | null
          fx_complexity?: string | null
          id?: string
          is_approved?: boolean
          motion_capture_required?: boolean | null
          notes?: string | null
          production_type?: string | null
          project_id?: string
          render_time_estimate?: string | null
          scene_id?: string | null
          simulation_feasibility?: string | null
          software_stack?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "technical_plans_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_plans_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_configurations: {
        Row: {
          created_at: string
          environment_variables: Json | null
          executable_path: string
          id: string
          is_active: boolean | null
          last_test_status: string | null
          last_tested_at: string | null
          tool_name: string
          updated_at: string
          version: string | null
        }
        Insert: {
          created_at?: string
          environment_variables?: Json | null
          executable_path: string
          id?: string
          is_active?: boolean | null
          last_test_status?: string | null
          last_tested_at?: string | null
          tool_name: string
          updated_at?: string
          version?: string | null
        }
        Update: {
          created_at?: string
          environment_variables?: Json | null
          executable_path?: string
          id?: string
          is_active?: boolean | null
          last_test_status?: string | null
          last_tested_at?: string | null
          tool_name?: string
          updated_at?: string
          version?: string | null
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
      user_specific_roles: {
        Row: {
          created_at: string
          id: string
          phase: string | null
          specific_role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          phase?: string | null
          specific_role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          phase?: string | null
          specific_role?: string
          user_id?: string
        }
        Relationships: []
      }
      vfx_analysis: {
        Row: {
          animation_cost_estimate: number | null
          animation_hours_estimate: number | null
          complexity: string | null
          created_at: string | null
          element_name: string
          element_type: string
          id: string
          live_action_cost_estimate: number | null
          live_action_hours_estimate: number | null
          notes: string | null
          project_id: string
          recommendation_reason: string | null
          recommended_method: string | null
          scene_id: string | null
          shot_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          animation_cost_estimate?: number | null
          animation_hours_estimate?: number | null
          complexity?: string | null
          created_at?: string | null
          element_name: string
          element_type: string
          id?: string
          live_action_cost_estimate?: number | null
          live_action_hours_estimate?: number | null
          notes?: string | null
          project_id: string
          recommendation_reason?: string | null
          recommended_method?: string | null
          scene_id?: string | null
          shot_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          animation_cost_estimate?: number | null
          animation_hours_estimate?: number | null
          complexity?: string | null
          created_at?: string | null
          element_name?: string
          element_type?: string
          id?: string
          live_action_cost_estimate?: number | null
          live_action_hours_estimate?: number | null
          notes?: string | null
          project_id?: string
          recommendation_reason?: string | null
          recommended_method?: string | null
          scene_id?: string | null
          shot_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vfx_analysis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vfx_analysis_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vfx_analysis_shot_id_fkey"
            columns: ["shot_id"]
            isOneToOne: false
            referencedRelation: "storyboards"
            referencedColumns: ["id"]
          },
        ]
      }
      visual_memory: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_name: string | null
          id: string
          memory_type: string
          project_id: string
          source_image_url: string | null
          updated_at: string
          visual_data: Json
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          id?: string
          memory_type: string
          project_id: string
          source_image_url?: string | null
          updated_at?: string
          visual_data?: Json
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          id?: string
          memory_type?: string
          project_id?: string
          source_image_url?: string | null
          updated_at?: string
          visual_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "visual_memory_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_recordings: {
        Row: {
          audio_url: string
          created_at: string
          created_by: string | null
          generated_storyboard_ids: string[] | null
          id: string
          project_id: string
          scene_id: string | null
          status: string | null
          transcription: string | null
        }
        Insert: {
          audio_url: string
          created_at?: string
          created_by?: string | null
          generated_storyboard_ids?: string[] | null
          id?: string
          project_id: string
          scene_id?: string | null
          status?: string | null
          transcription?: string | null
        }
        Update: {
          audio_url?: string
          created_at?: string
          created_by?: string | null
          generated_storyboard_ids?: string[] | null
          id?: string
          project_id?: string
          scene_id?: string | null
          status?: string | null
          transcription?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_recordings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_recordings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_recordings_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      whatif_variations: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_preferred: boolean | null
          prompt: string | null
          source_concept_id: string
          variation_params: Json | null
          variation_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_preferred?: boolean | null
          prompt?: string | null
          source_concept_id: string
          variation_params?: Json | null
          variation_type: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_preferred?: boolean | null
          prompt?: string | null
          source_concept_id?: string
          variation_params?: Json | null
          variation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatif_variations_source_concept_id_fkey"
            columns: ["source_concept_id"]
            isOneToOne: false
            referencedRelation: "concept_arts"
            referencedColumns: ["id"]
          },
        ]
      }
      work_employees: {
        Row: {
          created_at: string | null
          created_by: string | null
          department: string | null
          department_id: string | null
          designation: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          profile_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          department_id?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          profile_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          department_id?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          profile_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      work_progress_reports: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          image_urls: string[] | null
          percentage_complete: number | null
          progress_notes: string
          report_date: string
          task_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_urls?: string[] | null
          percentage_complete?: number | null
          progress_notes: string
          report_date?: string
          task_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_urls?: string[] | null
          percentage_complete?: number | null
          progress_notes?: string
          report_date?: string
          task_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_progress_reports_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "work_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      work_tasks: {
        Row: {
          assigned_by: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          employee_id: string
          id: string
          priority: string | null
          project_id: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          employee_id: string
          id?: string
          priority?: string | null
          project_id?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          employee_id?: string
          id?: string
          priority?: string | null
          project_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_tasks_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "work_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_presets: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean | null
          is_global: boolean | null
          name: string
          project_id: string | null
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          is_global?: boolean | null
          name: string
          project_id?: string | null
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          is_global?: boolean | null
          name?: string
          project_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_presets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_presets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_approve: { Args: { _user_id: string }; Returns: boolean }
      can_transition_stage: {
        Args: {
          _project_id: string
          _target_stage: Database["public"]["Enums"]["production_stage"]
        }
        Returns: boolean
      }
      check_generation_rate_limit: {
        Args: { _project_id: string; _user_id?: string }
        Returns: Json
      }
      create_notification: {
        Args: {
          p_entity_id?: string
          p_entity_type?: string
          p_message?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      get_profile_id: { Args: { _user_id: string }; Returns: string }
      get_team_lead_department: { Args: { _user_id: string }; Returns: string }
      get_user_role: { Args: { _user_id: string }; Returns: string }
      get_user_roles: {
        Args: { p_user_id: string }
        Returns: {
          phase: string
          specific_role: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_work_tracking_access: { Args: { _user_id: string }; Returns: boolean }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_room_admin: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      is_room_creator: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      is_room_participant: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_user: { Args: { _user_id: string }; Returns: boolean }
      is_team_lead: { Args: { _user_id: string }; Returns: boolean }
      route_asset_to_next_department: {
        Args: { p_approved_by: string; p_asset_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
      approval_type:
        | "script_draft"
        | "script_final"
        | "script_lock"
        | "concept_internal"
        | "concept_director"
        | "storyboard_internal"
        | "storyboard_director"
        | "animatic_internal"
        | "animatic_director"
        | "technical_plan"
        | "production_asset"
        | "post_review"
        | "client_final"
      art_style: "sketch" | "painterly" | "photoreal" | "matte" | "mixed"
      asset_category:
        | "environment"
        | "character"
        | "prop"
        | "vehicle"
        | "creature"
        | "fx_element"
      asset_detail_level: "hero" | "mid" | "background" | "proxy"
      asset_pipeline_status:
        | "created"
        | "assigned"
        | "in_progress"
        | "hod_review"
        | "internal_review"
        | "director_review"
        | "client_review"
        | "approved"
        | "rework_required"
        | "completed"
      asset_workflow_status:
        | "not_started"
        | "in_progress"
        | "internal_review"
        | "director_review"
        | "approved"
        | "locked"
      concept_art_type:
        | "environment"
        | "character"
        | "costume"
        | "prop"
        | "set_architecture"
        | "vehicle"
        | "creature"
        | "fx_concept"
      creative_context_scope:
        | "global"
        | "world"
        | "character"
        | "location"
        | "asset"
      creative_doc_type:
        | "character_backstory"
        | "world_mythology"
        | "location_environment"
        | "asset_prop_bible"
        | "cultural_symbolism"
        | "general"
      data_confidence: "verified" | "estimated" | "unknown"
      dispatch_status:
        | "pending"
        | "queued"
        | "approved"
        | "dispatched"
        | "in_progress"
        | "completed"
        | "blocked"
      export_format: "fbx" | "glb" | "usd" | "bvh"
      library_approval_status:
        | "pending"
        | "internal_review"
        | "approved"
        | "rejected"
        | "archived"
      library_asset_type:
        | "model_3d"
        | "texture"
        | "rig"
        | "animation"
        | "fx_preset"
        | "environment_pack"
        | "unreal_asset"
        | "audio"
        | "misc"
      location_type:
        | "film_studio"
        | "backlot"
        | "permanent_set"
        | "indoor_stage"
        | "outdoor_location"
        | "heritage_zone"
        | "urban_zone"
        | "rural_zone"
      motion_clip_status:
        | "draft"
        | "extracting"
        | "ready"
        | "retargeted"
        | "approved"
        | "exported"
      production_stage:
        | "pre_production"
        | "production"
        | "post_production"
        | "completed"
        | "archived"
      proxy_model_status:
        | "draft"
        | "generating"
        | "ready"
        | "approved"
        | "exported"
      risk_level: "low" | "medium" | "high" | "critical"
      user_role:
        | "director"
        | "producer"
        | "department_head"
        | "artist"
        | "client"
        | "super_user"
        | "production_manager"
        | "hod"
        | "vendor"
        | "script_writer"
        | "script_supervisor"
        | "concept_artist"
        | "art_director"
        | "storyboard_artist"
        | "editor"
        | "previz_artist"
        | "technical_director"
        | "modeling_artist"
        | "texturing_artist"
        | "rigging_artist"
        | "animation_artist"
        | "lighting_artist"
        | "vfx_artist"
        | "render_artist"
        | "compositor"
        | "storyboard_supervisor"
        | "production_lead"
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
      app_role: ["admin", "user"],
      approval_type: [
        "script_draft",
        "script_final",
        "script_lock",
        "concept_internal",
        "concept_director",
        "storyboard_internal",
        "storyboard_director",
        "animatic_internal",
        "animatic_director",
        "technical_plan",
        "production_asset",
        "post_review",
        "client_final",
      ],
      art_style: ["sketch", "painterly", "photoreal", "matte", "mixed"],
      asset_category: [
        "environment",
        "character",
        "prop",
        "vehicle",
        "creature",
        "fx_element",
      ],
      asset_detail_level: ["hero", "mid", "background", "proxy"],
      asset_pipeline_status: [
        "created",
        "assigned",
        "in_progress",
        "hod_review",
        "internal_review",
        "director_review",
        "client_review",
        "approved",
        "rework_required",
        "completed",
      ],
      asset_workflow_status: [
        "not_started",
        "in_progress",
        "internal_review",
        "director_review",
        "approved",
        "locked",
      ],
      concept_art_type: [
        "environment",
        "character",
        "costume",
        "prop",
        "set_architecture",
        "vehicle",
        "creature",
        "fx_concept",
      ],
      creative_context_scope: [
        "global",
        "world",
        "character",
        "location",
        "asset",
      ],
      creative_doc_type: [
        "character_backstory",
        "world_mythology",
        "location_environment",
        "asset_prop_bible",
        "cultural_symbolism",
        "general",
      ],
      data_confidence: ["verified", "estimated", "unknown"],
      dispatch_status: [
        "pending",
        "queued",
        "approved",
        "dispatched",
        "in_progress",
        "completed",
        "blocked",
      ],
      export_format: ["fbx", "glb", "usd", "bvh"],
      library_approval_status: [
        "pending",
        "internal_review",
        "approved",
        "rejected",
        "archived",
      ],
      library_asset_type: [
        "model_3d",
        "texture",
        "rig",
        "animation",
        "fx_preset",
        "environment_pack",
        "unreal_asset",
        "audio",
        "misc",
      ],
      location_type: [
        "film_studio",
        "backlot",
        "permanent_set",
        "indoor_stage",
        "outdoor_location",
        "heritage_zone",
        "urban_zone",
        "rural_zone",
      ],
      motion_clip_status: [
        "draft",
        "extracting",
        "ready",
        "retargeted",
        "approved",
        "exported",
      ],
      production_stage: [
        "pre_production",
        "production",
        "post_production",
        "completed",
        "archived",
      ],
      proxy_model_status: [
        "draft",
        "generating",
        "ready",
        "approved",
        "exported",
      ],
      risk_level: ["low", "medium", "high", "critical"],
      user_role: [
        "director",
        "producer",
        "department_head",
        "artist",
        "client",
        "super_user",
        "production_manager",
        "hod",
        "vendor",
        "script_writer",
        "script_supervisor",
        "concept_artist",
        "art_director",
        "storyboard_artist",
        "editor",
        "previz_artist",
        "technical_director",
        "modeling_artist",
        "texturing_artist",
        "rigging_artist",
        "animation_artist",
        "lighting_artist",
        "vfx_artist",
        "render_artist",
        "compositor",
        "storyboard_supervisor",
        "production_lead",
      ],
    },
  },
} as const
