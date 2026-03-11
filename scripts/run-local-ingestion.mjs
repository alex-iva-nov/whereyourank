import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.APP_BASE_URL ?? "http://localhost:3000";

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

const createCookieJar = () => {
  const jar = new Map();

  return {
    getAll() {
      return Array.from(jar.entries()).map(([name, value]) => ({ name, value }));
    },
    setAll(cookies) {
      for (const cookie of cookies) {
        jar.set(cookie.name, cookie.value);
      }
    },
    header() {
      return Array.from(jar.entries())
        .map(([name, value]) => `${name}=${value}`)
        .join("; ");
    },
  };
};

const waitForHealth = async () => {
  for (let i = 0; i < 30; i += 1) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return;
    } catch {
      // ignore
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`App health check failed at ${BASE_URL}/api/health`);
};

const localFiles = [
  "physiological_cycles.csv",
  "sleeps.csv",
  "workouts.csv",
  "journal_entries.csv",
];

const run = async () => {
  const envRaw = await fs.readFile(path.join(process.cwd(), ".env.local"), "utf8");
  const env = parseEnv(envRaw);

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseClientKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseClientKey || !serviceRole) {
    throw new Error("Missing required Supabase env vars in .env.local");
  }

  await waitForHealth();

  const email = `ingest_dev_${Date.now()}@example.com`;
  const password = "IngestDev#12345";

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createUserError || !createdUser.user) {
    throw new Error(`Failed to create dev user: ${createUserError?.message ?? "unknown"}`);
  }

  const userId = createdUser.user.id;

  try {
    const jar = createCookieJar();
    const authClient = createServerClient(supabaseUrl, supabaseClientKey, {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (cookies) => jar.setAll(cookies),
      },
    });

    const { error: signInError } = await authClient.auth.signInWithPassword({ email, password });
    if (signInError) throw new Error(`Sign-in failed: ${signInError.message}`);

    const onboardRes = await fetch(`${BASE_URL}/api/onboarding`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: jar.header(),
      },
      body: JSON.stringify({ ageBucket: "25_29", sex: "male", country: "DE" }),
    });

    if (!onboardRes.ok) {
      throw new Error(`Onboarding failed: ${onboardRes.status} ${await onboardRes.text()}`);
    }

    const formData = new FormData();
    for (const filename of localFiles) {
      const abs = path.join(process.cwd(), filename);
      const content = await fs.readFile(abs);
      formData.append("files", new File([content], filename, { type: "text/csv" }));
    }

    const uploadRes = await fetch(`${BASE_URL}/api/uploads`, {
      method: "POST",
      headers: {
        Cookie: jar.header(),
      },
      body: formData,
    });

    const payload = await uploadRes.json();

    if (!uploadRes.ok) {
      throw new Error(`Upload failed: ${uploadRes.status} ${JSON.stringify(payload)}`);
    }

    console.log(JSON.stringify({ userId, email, result: payload }, null, 2));
  } finally {
    await admin.auth.admin.deleteUser(userId);
  }
};

run().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
