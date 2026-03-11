import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";

const parseEnv = (text) => {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    out[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return out;
};

const run = async () => {
  const envRaw = await fs.readFile(path.join(process.cwd(), ".env.local"), "utf8");
  const env = parseEnv(envRaw);

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;
  const cohortMinN = Number(env.COHORT_MIN_SAMPLE_SIZE ?? "50");

  if (!supabaseUrl || !serviceRole) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }

  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const userId = process.argv.find((arg) => arg.startsWith("--user="))?.split("=")[1];

  if (userId) {
    const { data, error } = await supabase.rpc("recompute_analytics_for_user", {
      p_user_id: userId,
      p_window_end_date: new Date().toISOString().slice(0, 10),
    });

    if (error) throw new Error(error.message);
    console.log(JSON.stringify({ mode: "user", userId, result: data, cohortMinN }, null, 2));
    return;
  }

  const { data, error } = await supabase.rpc("recompute_analytics_for_all", {
    p_window_end_date: new Date().toISOString().slice(0, 10),
  });

  if (error) throw new Error(error.message);

  console.log(JSON.stringify({ mode: "all", result: data, cohortMinN }, null, 2));
};

run().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
