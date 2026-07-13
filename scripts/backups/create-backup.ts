import { promises as fs } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  assertNonEmptyDatabase,
  backupObjectKeys,
  buildR2Client,
  cleanupTempDir,
  encryptFile,
  fileSize,
  getDatabaseVersion,
  loadBackupConfig,
  objectExists,
  retentionClass,
  runCommand,
  safeSummary,
  sanitizeError,
  secureTempDir,
  sha256File,
  sha256Text,
  toolVersion,
  uploadJson,
  uploadObject,
  type BackupMetadata,
} from "./backup-utils";

async function recordBackup(metadata: BackupMetadata, result: string) {
  const prisma = new PrismaClient();
  try {
    await prisma.backupRecord.create({
      data: {
        environment: metadata.environment,
        databaseName: "redacted",
        version: metadata.applicationVersion,
        commit: metadata.commit,
        branch: metadata.branch,
        type: "EXTERNAL_LOGICAL" as any,
        status: "VERIFIED" as any,
        startedAt: new Date(metadata.createdAt),
        finishedAt: new Date(),
        durationMs: metadata.durationMs,
        sizeBytes: BigInt(metadata.encryptedSizeBytes),
        checksum: metadata.encryptedSha256,
        result,
        storageProvider: "cloudflare_r2_external_logical",
        storageRef: metadata.objectKey,
        validation: {
          ok: true,
          externalLogical: true,
          restoreRequired: true,
          dumpSha256: metadata.dumpSha256,
          encryptedSha256: metadata.encryptedSha256,
          metadataSha256: metadata.metadataSha256,
        },
        metadata: {
          backupId: metadata.backupId,
          bucketLogical: "cloudflare_r2_private_bucket",
          objectKey: metadata.objectKey,
          metadataKey: metadata.metadataKey,
          format: metadata.format,
          encrypted: metadata.encrypted,
          encryption: metadata.encryption,
          retentionClass: metadata.retentionClass,
        },
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function createExternalBackup() {
  const started = Date.now();
  const config = loadBackupConfig();
  const tempDir = await secureTempDir();
  const backupId = `miclub-${config.environment}-${new Date().toISOString().replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 10)}`;
  const dumpPath = join(tempDir, `${backupId}.dump`);
  const encryptedPath = join(tempDir, `${backupId}.dump.enc`);
  try {
    const sourceCounts = await assertNonEmptyDatabase(config.databaseUrl);
    const [databaseVersion, pgDumpVersion] = await Promise.all([
      getDatabaseVersion(config.databaseUrl),
      toolVersion("pg_dump"),
    ]);
    await runCommand("pg_dump", ["--format=custom", "--no-owner", "--no-privileges", "--file", dumpPath, config.databaseUrl]);
    const dumpSha256 = await sha256File(dumpPath);
    await encryptFile(dumpPath, encryptedPath, config.encryptionKey);
    const encryptedSha256 = await sha256File(encryptedPath);
    const sizeBytes = await fileSize(dumpPath);
    const encryptedSizeBytes = await fileSize(encryptedPath);
    const keys = backupObjectKeys(config.environment, backupId);
    const metadata: BackupMetadata = {
      backupId,
      environment: config.environment,
      createdAt: new Date(started).toISOString(),
      databaseEngine: "postgresql",
      databaseVersion,
      pgDumpVersion,
      applicationVersion: config.appVersion,
      commit: config.commit,
      branch: config.branch,
      format: "custom",
      encrypted: true,
      encryption: "AES-256-GCM",
      objectKey: keys.dumpKey,
      metadataKey: keys.metadataKey,
      sizeBytes,
      encryptedSizeBytes,
      dumpSha256,
      encryptedSha256,
      durationMs: Date.now() - started,
      status: "UPLOADED",
      storageProvider: "cloudflare_r2",
      retentionClass: retentionClass(new Date(started)),
      protected: false,
    };
    metadata.metadataSha256 = sha256Text(JSON.stringify({ ...metadata, metadataSha256: undefined }));
    const client = buildR2Client(config);
    await uploadObject(client, config.r2BucketName, keys.dumpKey, encryptedPath);
    await uploadObject(client, config.r2BucketName, keys.cryptoKey, `${encryptedPath}.crypto.json`, "application/json");
    await uploadJson(client, config.r2BucketName, keys.metadataKey, { ...metadata, status: "VERIFIED", sourceCounts });
    await Promise.all([
      objectExists(client, config.r2BucketName, keys.dumpKey),
      objectExists(client, config.r2BucketName, keys.cryptoKey),
      objectExists(client, config.r2BucketName, keys.metadataKey),
    ]);
    metadata.status = "VERIFIED";
    metadata.durationMs = Date.now() - started;
    if (process.env.BACKUP_RECORD_HISTORY === "true") await recordBackup(metadata, "Backup externo R2 verificado");
    console.log(JSON.stringify({ ok: true, summary: safeSummary(metadata) }, null, 2));
    return metadata;
  } catch (error) {
    console.error(`Backup externo falló: ${sanitizeError(error)}`);
    process.exitCode = 1;
    throw error;
  } finally {
    await cleanupTempDir(tempDir);
  }
}

if (require.main === module) {
  createExternalBackup().catch(() => undefined);
}
