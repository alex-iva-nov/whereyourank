import { createBrowserClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/env";

export const createSupabaseBrowserClient = () =>
  createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseClientKey);
