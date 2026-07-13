import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { existsSync, promises as fs } from "node:fs";
import { join } from "node:path";
import {
  cleanupTempDir,
  computeRetentionPlan,
  decryptFile,
  encryptFile,
  assertTemporaryRestoreTarget,
  loadBackupConfig,
  parseEncryptionKey,
  sanitizeError,
  secureTempDir,
  sha256File,
  sha256Text,
  type BackupMetadata,
} from "./backups/backup-utils";

const validEnv = {
  BACKUP_ENVIRONMENT: "staging",
  DATABASE_URL: "postgresql://user:pass@staging-host.railway.internal:5432/miclub_staging",
  STAGING_DATABASE_CONFIRM: "miclub-staging",
  R2_ACCOUNT_ID: "account",
  R2_ACCESS_KEY_ID: "access",
  R2_SECRET_ACCESS_KEY: "secret",
  R2_BUCKET_NAME: "miclub-chile-backups",
  R2_ENDPOINT: "https://account.r2.cloudflarestorage.com",
  BACKUP_ENCRYPTION_KEY: `base64:${randomBytes(32).toString("base64")}`,
  APP_VERSION: "1.1.0",
  GIT_COMMIT_SHA: "95dec89",
  GIT_BRANCH: "fix/mvp-comercial-readiness",
};

async function testEnvGuards() {
  assert.throws(() => loadBackupConfig({ ...validEnv, BACKUP_ENVIRONMENT: "qa" } as any), /staging o production/);
  assert.throws(() => loadBackupConfig({ ...validEnv, BACKUP_ENVIRONMENT: "production" } as any), /Backup productivo bloqueado/);
  assert.throws(() => loadBackupConfig({ ...validEnv, R2_BUCKET_NAME: "public-assets" } as any), /bucket dedicado/);
  assert.throws(() => parseEncryptionKey(Buffer.from("short").toString("base64")), /32 bytes/);
  const prod = loadBackupConfig({ ...validEnv, BACKUP_ENVIRONMENT: "production", ALLOW_PRODUCTION_BACKUP: "true", DATABASE_URL: "postgresql://user:pass@prod-host:5432/miclub" } as any);
  assert.equal(prod.environment, "production");
  assert.throws(
    () => assertTemporaryRestoreTarget("postgresql://user:pass@prod-host:5432/miclub", "postgresql://user:pass@temp-host:5432/miclub_restore", undefined),
    /TEMPORARY_RESTORE_CONFIRM/,
  );
  assert.throws(
    () => assertTemporaryRestoreTarget("postgresql://user:pass@prod-host:5432/miclub", "postgresql://user:pass@prod-host:5432/miclub", "TEMPORARY_DATABASE_ONLY"),
    /coincide/,
  );
  assert.doesNotThrow(() => assertTemporaryRestoreTarget(
    "postgresql://user:pass@prod-host:5432/miclub",
    "postgresql://user:pass@temp-host:5432/miclub_production_restore_drill_temp",
    "TEMPORARY_DATABASE_ONLY",
  ));
}

async function testEncryptionChecksumAndTamperDetection() {
  const dir = await secureTempDir("miclub-test-backup-");
  const plain = join(dir, "plain.dump");
  const encrypted = join(dir, "plain.dump.enc");
  const decrypted = join(dir, "decrypted.dump");
  const key = randomBytes(32);
  try {
    await fs.writeFile(plain, Buffer.from("backup-content"));
    const before = await sha256File(plain);
    await encryptFile(plain, encrypted, key);
    assert.notEqual(await sha256File(encrypted), before, "archivo cifrado debe tener checksum distinto");
    await decryptFile(encrypted, decrypted, key);
    assert.equal(await sha256File(decrypted), before, "descifrado debe conservar checksum original");
    const fd = await fs.open(encrypted, "r+");
    const one = Buffer.alloc(1);
    await fd.read(one, 0, 1, 0);
    one[0] = one[0] ^ 1;
    await fd.write(one, 0, 1, 0);
    await fd.close();
    await assert.rejects(() => decryptFile(encrypted, join(dir, "tampered.dump"), key), /Unsupported state|authenticate|bad decrypt|invalid/i);
  } finally {
    await cleanupTempDir(dir);
  }
  assert.equal(existsSync(dir), false, "temp dir debe eliminarse");
}

async function testRetentionDryRun() {
  const now = new Date("2026-07-13T00:00:00Z");
  const plan = computeRetentionPlan([
    { key: "staging/new.dump.enc", lastModified: new Date("2026-07-12T00:00:00Z") },
    { key: "staging/old.dump.enc", lastModified: new Date("2026-06-01T00:00:00Z") },
    { key: "staging/protected.dump.enc", lastModified: new Date("2026-05-01T00:00:00Z"), protected: true },
  ], now, true);
  assert.equal(plan.dryRun, true);
  assert.deepEqual(plan.deleteKeys, ["staging/old.dump.enc"]);
  assert(plan.protectedKeys.includes("staging/new.dump.enc"), "backup más reciente debe protegerse");
  assert(plan.protectedKeys.includes("staging/protected.dump.enc"), "backup protegido debe conservarse");
}

async function testMetadataAndSanitizedLogs() {
  const metadata: BackupMetadata = {
    backupId: "backup-1",
    environment: "staging",
    createdAt: new Date().toISOString(),
    databaseEngine: "postgresql",
    databaseVersion: "PostgreSQL 16",
    pgDumpVersion: "pg_dump 16",
    applicationVersion: "1.1.0",
    commit: "95dec89",
    branch: "fix/mvp-comercial-readiness",
    format: "custom",
    encrypted: true,
    encryption: "AES-256-GCM",
    objectKey: "staging/2026/07/13/backup.dump.enc",
    metadataKey: "metadata/staging/2026/07/13/backup.metadata.json",
    sizeBytes: 10,
    encryptedSizeBytes: 20,
    dumpSha256: sha256Text("dump"),
    encryptedSha256: sha256Text("encrypted"),
    durationMs: 100,
    status: "VERIFIED",
    storageProvider: "cloudflare_r2",
    retentionClass: "daily",
    protected: false,
  };
  const text = JSON.stringify(metadata);
  assert(!/DATABASE_URL|postgresql:\/\/|R2_SECRET|BACKUP_ENCRYPTION_KEY/i.test(text));
  const sanitized = sanitizeError("DATABASE_URL=postgresql://user:pass@host/db R2_SECRET_ACCESS_KEY=abc BACKUP_ENCRYPTION_KEY=xyz");
  assert(!sanitized.includes("pass@host"));
  assert(!sanitized.includes("abc"));
  assert(!sanitized.includes("xyz"));
}

async function main() {
  await testEnvGuards();
  await testEncryptionChecksumAndTamperDetection();
  await testRetentionDryRun();
  await testMetadataAndSanitizedLogs();
  console.log("OK: RC-B1 backups externos, cifrado, checksum, retención dry-run y secretos sanitizados verificados");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
