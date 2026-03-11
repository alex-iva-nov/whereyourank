import dns from "node:dns/promises";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { Client } from "pg";

const projectRoot = process.cwd();

async function loadEnv(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  const env = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;

    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    env[key] = value;
  }

  return env;
}

function parsePostgresUrl(url) {
  const m = url.match(/^postgres(?:ql)?:\/\/([^:]+):(.+)@([^:\/]+):(\d+)\/([^?]+)$/i);
  if (!m) {
    throw new Error("DATABASE_URL is not in expected format postgresql://user:pass@host:port/db");
  }

  return {
    user: m[1],
    password: m[2],
    host: m[3],
    port: Number(m[4]),
    database: m[5],
  };
}

async function connectWithIpv6Fallback(conn) {
  const baseConfig = {
    ...conn,
    ssl: { rejectUnauthorized: false },
  };

  let client = new Client(baseConfig);
  try {
    await client.connect();
    return client;
  } catch (err) {
    const message = String(err?.message ?? err);
    if (!message.includes("ENOENT")) {
      throw err;
    }

    const ipv6Addresses = await dns.resolve6(conn.host);
    if (ipv6Addresses.length === 0) {
      throw err;
    }

    client = new Client({ ...baseConfig, host: ipv6Addresses[0] });
    await client.connect();
    return client;
  }
}

async function run() {
  const envPath = path.join(projectRoot, ".env.local");
  const env = await loadEnv(envPath);

  if (!env.DATABASE_URL) {
    throw new Error("Missing DATABASE_URL in .env.local");
  }

  const conn = parsePostgresUrl(env.DATABASE_URL);
  const client = await connectWithIpv6Fallback(conn);

  try {
    const migrationsDir = path.join(projectRoot, "supabase", "migrations");
    const files = (await fs.readdir(migrationsDir))
      .filter((f) => f.endsWith(".sql"))
      .sort();

    console.log("Applying migrations:", files.join(", "));

    for (const file of files) {
      const fullPath = path.join(migrationsDir, file);
      const sql = await fs.readFile(fullPath, "utf8");

      try {
        await client.query("begin");
        await client.query(sql);
        await client.query("commit");
        console.log(`OK ${file}`);
      } catch (err) {
        await client.query("rollback");
        console.error(`FAIL ${file}`);
        throw err;
      }
    }

    const requiredTables = [
      "user_profiles",
      "consent_events",
      "upload_batches",
      "upload_files",
      "parse_jobs",
      "parse_errors",
      "whoop_physiological_cycles",
      "whoop_sleeps",
      "whoop_workouts",
      "whoop_journal_entries",
      "user_metric_daily",
      "user_metric_rollups",
      "cohort_metric_distributions",
      "user_metric_percentiles",
      "deletion_requests",
    ];

    const tablesRes = await client.query(
      `
      select tablename
      from pg_tables
      where schemaname = 'public'
      and tablename = any($1::text[])
      order by tablename
      `,
      [requiredTables],
    );

    const requiredIndexes = [
      "idx_upload_files_user_uploaded_at",
      "idx_upload_files_user_kind_uploaded_at",
      "idx_user_metric_daily_user_metric_date",
      "idx_user_metric_daily_user_date",
      "idx_user_metric_percentiles_user_computed",
      "idx_cohort_metric_distributions_lookup",
      "idx_cohort_metric_distributions_metric_lookup",
      "idx_deletion_requests_user_requested",
    ];

    const indexesRes = await client.query(
      `
      select indexname
      from pg_indexes
      where schemaname = 'public'
      and indexname = any($1::text[])
      order by indexname
      `,
      [requiredIndexes],
    );

    const bucketRes = await client.query(
      `select id, name, public from storage.buckets where id = 'whoop-raw-uploads'`,
    );

    const storagePoliciesRes = await client.query(`
      select policyname
      from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname like 'storage_whoop_raw_upload_%'
      order by policyname
    `);

    console.log("\nVerification:");
    console.log("Tables found:", tablesRes.rows.map((r) => r.tablename).join(", "));
    console.log("Indexes found:", indexesRes.rows.map((r) => r.indexname).join(", "));
    console.log("Bucket:", bucketRes.rows[0] ?? null);
    console.log(
      "Storage policies:",
      storagePoliciesRes.rows.map((r) => r.policyname).join(", "),
    );
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
