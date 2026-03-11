import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { Client as PgClient } from "pg";

const baseUrl = "http://localhost:3000";

function parseEnv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    out[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return out;
}

function parseDbUrl(url) {
  const m = url.match(/^postgres(?:ql)?:\/\/([^:]+):(.+)@([^:\/]+):(\d+)\/([^?]+)$/i);
  if (!m) throw new Error("Invalid DATABASE_URL format");
  return {
    user: m[1],
    password: m[2],
    host: m[3],
    port: Number(m[4]),
    database: m[5],
  };
}

function createCookieJar() {
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
}

async function assertHttpOk(response, context) {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${context} failed: ${response.status} ${body}`);
  }
}

async function run() {
  const envRaw = await fs.readFile(path.join(process.cwd(), ".env.local"), "utf8");
  const env = parseEnv(envRaw);

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseClientKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const databaseUrl = env.DATABASE_URL;

  if (!supabaseUrl || !supabaseClientKey || !serviceRoleKey || !databaseUrl) {
    throw new Error("Missing required env vars for verification script");
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const email = `slice_${Date.now()}@example.com`;
  const password = "SliceTest#12345";

  const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createUserError || !createdUser.user) {
    throw new Error(`Failed to create test user: ${createUserError?.message ?? "unknown"}`);
  }

  const userId = createdUser.user.id;

  try {
    const jar = createCookieJar();
    const ssrClient = createServerClient(supabaseUrl, supabaseClientKey, {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (cookies) => jar.setAll(cookies),
      },
    });

    const { error: signInError } = await ssrClient.auth.signInWithPassword({ email, password });
    if (signInError) {
      throw new Error(`Sign-in failed: ${signInError.message}`);
    }

    if (!jar.header()) {
      throw new Error("No auth cookies were set after sign-in");
    }

    const signInPageRes = await fetch(`${baseUrl}/sign-in`);
    await assertHttpOk(signInPageRes, "GET /sign-in");

    const rootRes = await fetch(`${baseUrl}/`, {
      headers: { Cookie: jar.header() },
      redirect: "manual",
    });

    if (![302, 303, 307, 308].includes(rootRes.status)) {
      throw new Error(`Expected redirect from / for authenticated user, got ${rootRes.status}`);
    }

    const onboardingRes = await fetch(`${baseUrl}/api/onboarding`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: jar.header(),
      },
      body: JSON.stringify({ ageBucket: "25_29", sex: "male", country: "DE" }),
    });
    await assertHttpOk(onboardingRes, "POST /api/onboarding");

    const physiologicalCycles = await fs.readFile(path.join(process.cwd(), "physiological_cycles.csv"));
    const sleeps = await fs.readFile(path.join(process.cwd(), "sleeps.csv"));

    const uploadForm = new FormData();
    uploadForm.append("files", new File([physiologicalCycles], "physiological_cycles.csv", { type: "text/csv" }));
    uploadForm.append("files", new File([sleeps], "sleeps.csv", { type: "text/csv" }));

    const uploadRes = await fetch(`${baseUrl}/api/uploads`, {
      method: "POST",
      headers: { Cookie: jar.header() },
      body: uploadForm,
    });
    await assertHttpOk(uploadRes, "POST /api/uploads");

    const uploadPayload = await uploadRes.json();
    const batchId = uploadPayload.batchId;

    if (!batchId) {
      throw new Error("Upload response missing batchId");
    }

    const db = new PgClient({
      ...parseDbUrl(databaseUrl),
      ssl: { rejectUnauthorized: false },
    });

    await db.connect();
    try {
      const batchCheck = await db.query(
        `select id, user_id, status from public.upload_batches where id = $1`,
        [batchId],
      );

      if (batchCheck.rowCount !== 1) {
        throw new Error(`upload_batches row not found for batch ${batchId}`);
      }

      if (batchCheck.rows[0].user_id !== userId) {
        throw new Error("upload_batches user_id mismatch");
      }

      const filesCheck = await db.query(
        `select file_kind, user_id from public.upload_files where batch_id = $1 order by file_kind`,
        [batchId],
      );

      if (filesCheck.rowCount !== 2) {
        throw new Error(`Expected 2 upload_files rows, got ${filesCheck.rowCount}`);
      }

      const kinds = filesCheck.rows.map((r) => r.file_kind).sort();
      if (kinds.join(",") !== "physiological_cycles,sleeps") {
        throw new Error(`Unexpected upload file kinds: ${kinds.join(",")}`);
      }

      const invalidOwner = filesCheck.rows.find((r) => r.user_id !== userId);
      if (invalidOwner) {
        throw new Error("upload_files user_id mismatch");
      }
    } finally {
      await db.end();
    }

    const dashboardRes = await fetch(`${baseUrl}/dashboard`, {
      headers: { Cookie: jar.header() },
    });
    await assertHttpOk(dashboardRes, "GET /dashboard");

    const dashboardHtml = await dashboardRes.text();
    if (!dashboardHtml.includes("WhereYouRank")) {
      throw new Error("Dashboard brand marker not found");
    }

    console.log("Vertical slice verification: OK");
    console.log(`Test user: ${email}`);
    console.log(`Upload batch: ${batchId}`);
  } finally {
    await admin.auth.admin.deleteUser(userId);
  }
}

run().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
