import { promises as fs } from "node:fs";
import { join } from "node:path";
import {
  buildR2Client,
  cleanupTempDir,
  decryptFile,
  downloadObject,
  getTableCounts,
  loadBackupConfig,
  runCommand,
  secureTempDir,
  sha256File,
  toolVersion,
  type BackupMetadata,
} from "./backup-utils";

export async function restoreExternalBackup(metadataKey = process.env.BACKUP_METADATA_KEY, targetDatabaseUrl = process.env.TEMPORARY_RESTORE_DATABASE_URL) {
  if (!metadataKey) throw new Error("BACKUP_METADATA_KEY requerido");
  if (!targetDatabaseUrl) throw new Error("TEMPORARY_RESTORE_DATABASE_URL requerido");
  const config = loadBackupConfig();
  if (!config.allowTemporaryRestore) throw new Error("Restore temporal bloqueado: define ALLOW_TEMPORARY_RESTORE=true");
  if (/prod|production/i.test(targetDatabaseUrl)) throw new Error("Restore rechazado: target parece producción");
  const started = Date.now();
  const client = buildR2Client(config);
  const tempDir = await secureTempDir("miclub-restore-");
  const metadataPath = join(tempDir, "metadata.json");
  const encryptedPath = join(tempDir, "backup.dump.enc");
  const cryptoPath = `${encryptedPath}.crypto.json`;
  const dumpPath = join(tempDir, "backup.dump");
  try {
    await downloadObject(client, config.r2BucketName, metadataKey, metadataPath);
    const raw = JSON.parse(await fs.readFile(metadataPath, "utf8"));
    const metadata = raw as BackupMetadata & { sourceCounts?: Record<string, number | "missing"> };
    await downloadObject(client, config.r2BucketName, metadata.objectKey, encryptedPath);
    await downloadObject(client, config.r2BucketName, metadata.objectKey.replace(/\.dump\.enc$/, ".dump.enc.crypto.json"), cryptoPath);
    if (await sha256File(encryptedPath) !== metadata.encryptedSha256) throw new Error("Checksum cifrado inválido");
    await decryptFile(encryptedPath, dumpPath, config.encryptionKey, cryptoPath);
    if (await sha256File(dumpPath) !== metadata.dumpSha256) throw new Error("Checksum dump inválido");
    const pgRestoreVersion = await toolVersion("pg_restore");
    await runCommand("pg_restore", ["--clean", "--if-exists", "--no-owner", "--no-privileges", "--dbname", targetDatabaseUrl, dumpPath]);
    const restoredCounts = await getTableCounts(targetDatabaseUrl);
    const differences: Record<string, { source: unknown; restored: unknown }> = {};
    for (const [table, source] of Object.entries(metadata.sourceCounts ?? {})) {
      if (restoredCounts[table] !== source) differences[table] = { source, restored: restoredCounts[table] };
    }
    const ok = Object.keys(differences).length === 0;
    const result = {
      ok,
      backupId: metadata.backupId,
      pgRestoreVersion,
      durationMs: Date.now() - started,
      restoredCounts,
      differences,
    };
    console.log(JSON.stringify(result, null, 2));
    if (!ok) throw new Error("Restore temporal completado con diferencias de conteo");
    return result;
  } finally {
    await cleanupTempDir(tempDir);
  }
}

if (require.main === module) {
  restoreExternalBackup().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
