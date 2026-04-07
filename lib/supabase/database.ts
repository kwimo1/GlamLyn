export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type LooseTable = {
  Row: Record<string, Json | undefined>;
  Insert: Record<string, Json | undefined>;
  Update: Record<string, Json | undefined>;
  Relationships: [];
};

export interface SupabaseDatabase {
  public: {
    Tables: {
      admin_users: LooseTable;
      booking_events: LooseTable;
      booking_services: LooseTable;
      bookings: LooseTable;
      business_settings: LooseTable;
      customer_profiles: LooseTable;
      google_review_snapshots: LooseTable;
      instagram_reels: LooseTable;
      media_assets: LooseTable;
      notification_logs: LooseTable;
      service_categories: LooseTable;
      services: LooseTable;
      site_reviews: LooseTable;
    };
    Views: Record<string, never>;
    Functions: {
      create_booking_with_services: {
        Args: {
          p_customer_email: string | null;
          p_customer_id: string | null;
          p_customer_name: string;
          p_customer_phone: string | null;
          p_notes: string | null;
          p_service_ids: string[];
          p_source: string;
          p_starts_at: string;
        };
        Returns: string;
      };
      increment_customer_points: {
        Args: {
          p_customer_id: string;
          p_points: number;
        };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
