import { createClient } from "@supabase/supabase-js";

import { config, isSupabaseConfigured } from "@/lib/config";

export function createSupabaseAdminClient() {
  if (!isSupabaseConfigured) {
    return null;
  }
  return createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: { persistSession: false },
  });
}

