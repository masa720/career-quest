import type {
  TaskCategory,
  TaskPriority,
  TaskStatus,
} from "@/features/tasks/types";

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
          status: TaskStatus;
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
          status?: TaskStatus;
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
          status?: TaskStatus;
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
          updated_at: string;
        };
        Insert: {
          id?: number;
          visa_expiry_date?: string | null;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          visa_expiry_date?: string | null;
          timezone?: string;
          updated_at?: string;
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
      move_task: {
        Args: {
          p_task_id: string;
          p_target_status: TaskStatus;
          p_column_orders: Json;
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
