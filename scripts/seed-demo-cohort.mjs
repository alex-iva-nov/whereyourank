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

const random = (seed) => {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
};

const AGE_BUCKETS = ["13_18", "18_24", "25_29", "30_34", "35_39", "40_44", "45_49", "50_54", "55_59", "60_64", "65_69", "70_74", "75_79", "80_plus"];
const SEXES = ["female", "male"];

const getAgeAnchor = (ageBucket) => {
  if (ageBucket === "13_18") return 15.5;
  if (ageBucket === "18_24") return 21;
  if (ageBucket === "80_plus") return 82.5;

  const match = ageBucket.match(/^(\d+)_/);
  return match ? Number(match[1]) + 2 : 30;
};

const getBaseByAge = (ageBucket) => {
  const age = getAgeAnchor(ageBucket);
  const yearsFrom25 = age - 25;

  return {
    hrv: 75 - yearsFrom25 * 0.62,
    rec: 71 - yearsFrom25 * 0.28,
    sleep: 81 - yearsFrom25 * 0.12,
    asleep: 424 - yearsFrom25 * 1.1,
    strain: 11.5 - yearsFrom25 * 0.08,
  };
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const run = async () => {
  const envRaw = await fs.readFile(path.join(process.cwd(), ".env.local"), "utf8");
  const env = parseEnv(envRaw);

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRole) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }

  const countArg = process.argv.find((arg) => arg.startsWith("--count="));
  const count = countArg ? Number(countArg.split("=")[1]) : 120;
  if (!Number.isFinite(count) || count <= 0) {
    throw new Error("--count must be a positive number");
  }

  const seedArg = process.argv.find((arg) => arg.startsWith("--seed="));
  const seed = seedArg ? Number(seedArg.split("=")[1]) : 42;

  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const rnd = random(seed);
  const today = new Date().toISOString().slice(0, 10);

  const createdUsers = [];

  for (let i = 0; i < count; i += 1) {
    const email = `demo_cohort_${Date.now()}_${i}@example.com`;
    const password = `DemoSeed#${Math.floor(rnd() * 1000000)}`;

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError || !created.user) {
      throw new Error(`Failed to create demo user ${i}: ${createError?.message ?? "unknown"}`);
    }

    createdUsers.push(created.user.id);

    const ageBucket = AGE_BUCKETS[Math.floor(rnd() * AGE_BUCKETS.length)];
    const sex = SEXES[Math.floor(rnd() * SEXES.length)];
    const base = getBaseByAge(ageBucket);
    const sexOffset = sex === "male" ? 1.2 : -1.2;

    const profile = {
      user_id: created.user.id,
      age_bucket: ageBucket,
      sex,
      country: "DE",
    };

    const metrics = [
      {
        user_id: created.user.id,
        metric_key: "hrv_ms",
        window_end_date: today,
        metric_value: clamp(base.hrv + sexOffset + (rnd() - 0.5) * 18, 18, 140),
        sample_days: 30,
      },
      {
        user_id: created.user.id,
        metric_key: "recovery_score_pct",
        window_end_date: today,
        metric_value: clamp(base.rec + (rnd() - 0.5) * 22, 1, 99),
        sample_days: 30,
      },
      {
        user_id: created.user.id,
        metric_key: "sleep_performance_pct",
        window_end_date: today,
        metric_value: clamp(base.sleep + (rnd() - 0.5) * 16, 35, 99),
        sample_days: 30,
      },
      {
        user_id: created.user.id,
        metric_key: "asleep_duration_min",
        window_end_date: today,
        metric_value: clamp(base.asleep + (rnd() - 0.5) * 80, 220, 620),
        sample_days: 30,
      },
      {
        user_id: created.user.id,
        metric_key: "day_strain",
        window_end_date: today,
        metric_value: clamp(base.strain + (rnd() - 0.5) * 8, 1, 20),
        sample_days: 30,
      },
    ];

    const { error: profileError } = await supabase.from("user_profiles").upsert(profile, { onConflict: "user_id" });
    if (profileError) {
      throw new Error(`Failed to upsert profile for demo user ${i}: ${profileError.message}`);
    }

    const { error: metricsError } = await supabase
      .from("user_metric_30d_aggregates")
      .upsert(metrics, { onConflict: "user_id,metric_key,window_end_date" });

    if (metricsError) {
      throw new Error(`Failed to upsert aggregates for demo user ${i}: ${metricsError.message}`);
    }
  }

  const { error: recomputeError } = await supabase.rpc("recompute_cohort_metric_percentiles", {
    p_window_end_date: today,
  });

  if (recomputeError) {
    throw new Error(`Failed to recompute cohort percentiles: ${recomputeError.message}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        usersCreated: createdUsers.length,
        windowEndDate: today,
      },
      null,
      2,
    ),
  );
};

run().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});