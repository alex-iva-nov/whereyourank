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
  const migrationFile = process.argv[2];
  if (!migrationFile) {
    throw new Error("Usage: node scripts/apply-single-migration.mjs <migration-file.sql>");
  }

  const envPath = path.join(projectRoot, ".env.local");
  const env = await loadEnv(envPath);

  if (!env.DATABASE_URL) {
    throw new Error("Missing DATABASE_URL in .env.local");
  }

  const migrationPath = path.join(projectRoot, "supabase", "migrations", migrationFile);
  const sql = await fs.readFile(migrationPath, "utf8");

  const conn = parsePostgresUrl(env.DATABASE_URL);
  const client = await connectWithIpv6Fallback(conn);

  try {
    await client.query("begin");
    await client.query(sql);
    await client.query("commit");
    console.log(`OK ${migrationFile}`);
  } catch (err) {
    await client.query("rollback");
    console.error(`FAIL ${migrationFile}`);
    throw err;
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
