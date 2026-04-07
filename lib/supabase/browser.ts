"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseDatabase } from "@/lib/supabase/database";

let browserClient: ReturnType<typeof createBrowserClient<SupabaseDatabase>> | null = null;

export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  if (!browserClient) {
    browserClient = createBrowserClient<SupabaseDatabase>(url, anonKey);
  }

  return browserClient;
}
