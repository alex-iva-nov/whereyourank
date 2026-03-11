import { createClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/env";

export const supabaseAdmin = createClient(
  getServerEnv().supabaseUrl,
  getServerEnv().supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
