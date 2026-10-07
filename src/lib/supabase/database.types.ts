import type { TaskCategory, TaskPriority } from "@/features/tasks/types";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string;
          category: TaskCategory;
          title: string;
          priority: TaskPriority;
          description: string | null;
          memo: string | null;
          is_completed: boolean;
          scheduled_for: string | null;
          selected_at: string | null;
          position: number;
          is_daily: boolean;
          review_of_task_id: string | null;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          category: TaskCategory;
          title: string;
          priority?: TaskPriority;
          description?: string | null;
          memo?: string | null;
          is_completed?: boolean;
          scheduled_for?: string | null;
          selected_at?: string | null;
          position?: number;
          is_daily?: boolean;
          review_of_task_id?: string | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          category?: TaskCategory;
          title?: string;
          priority?: TaskPriority;
          description?: string | null;
          memo?: string | null;
          is_completed?: boolean;
          scheduled_for?: string | null;
          selected_at?: string | null;
          position?: number;
          is_daily?: boolean;
          review_of_task_id?: string | null;
          updated_at?: string;
          completed_at?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      task_completion_events: {
        Row: {
          id: string;
          task_id: string;
          completed_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          completed_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      app_settings: {
        Row: {
          id: number;
          visa_expiry_date: string | null;
          timezone: string;
          notifications_enabled: boolean;
          morning_notification_time: string;
          evening_notification_time: string;
          notification_function_url: string | null;
          notification_cron_secret: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          visa_expiry_date?: string | null;
          timezone?: string;
          notifications_enabled?: boolean;
          morning_notification_time?: string;
          evening_notification_time?: string;
          notification_function_url?: string | null;
          notification_cron_secret?: string;
          updated_at?: string;
        };
        Update: {
          visa_expiry_date?: string | null;
          timezone?: string;
          notifications_enabled?: boolean;
          morning_notification_time?: string;
          evening_notification_time?: string;
          notification_function_url?: string | null;
          notification_cron_secret?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          created_at: string;
          updated_at: string;
          last_seen_at: string;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
          last_seen_at?: string;
          revoked_at?: string | null;
        };
        Update: {
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          user_agent?: string | null;
          updated_at?: string;
          last_seen_at?: string;
          revoked_at?: string | null;
        };
        Relationships: [];
      };
      notification_deliveries: {
        Row: {
          id: string;
          subscription_id: string;
          notification_type: "morning" | "evening" | "test";
          local_date: string | null;
          status: "pending" | "sent" | "failed";
          sent_at: string | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          subscription_id: string;
          notification_type: "morning" | "evening" | "test";
          local_date?: string | null;
          status?: "pending" | "sent" | "failed";
          sent_at?: string | null;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          status?: "pending" | "sent" | "failed";
          sent_at?: string | null;
          error_message?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_current_streak: {
        Args: { p_timezone: string };
        Returns: number;
      };
      set_task_completion: {
        Args: {
          p_task_id: string;
          p_is_completed: boolean;
        };
        Returns: Database["public"]["Tables"]["tasks"]["Row"][];
      };
      rollover_daily_tasks: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
