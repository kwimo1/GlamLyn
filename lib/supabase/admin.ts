import { createClient } from "@supabase/supabase-js";
import { requireServiceRoleConfig } from "@/lib/supabase/config";
import type { SupabaseDatabase } from "@/lib/supabase/database";

let adminClient: ReturnType<typeof createClient<SupabaseDatabase>> | null = null;

export function getSupabaseAdmin() {
  if (!adminClient) {
    const { url, serviceRoleKey } = requireServiceRoleConfig();
    adminClient = createClient<SupabaseDatabase>(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return adminClient;
}
