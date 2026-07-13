import { promises as fs } from "node:fs";
import { join } from "node:path";
import {
  buildR2Client,
  cleanupTempDir,
  decryptFile,
  downloadObject,
  loadBackupConfig,
  secureTempDir,
  sha256File,
  type BackupMetadata,
} from "./backup-utils";

export async function verifyExternalBackup(metadataKey = process.env.BACKUP_METADATA_KEY) {
  if (!metadataKey) throw new Error("BACKUP_METADATA_KEY requerido");
  const config = loadBackupConfig();
  const client = buildR2Client(config);
  const tempDir = await secureTempDir("miclub-verify-");
  const metadataPath = join(tempDir, "metadata.json");
  const encryptedPath = join(tempDir, "backup.dump.enc");
  const cryptoPath = `${encryptedPath}.crypto.json`;
  const dumpPath = join(tempDir, "backup.dump");
  try {
    await downloadObject(client, config.r2BucketName, metadataKey, metadataPath);
    const raw = JSON.parse(await fs.readFile(metadataPath, "utf8"));
    const metadata = raw as BackupMetadata;
    await downloadObject(client, config.r2BucketName, metadata.objectKey, encryptedPath);
    await downloadObject(client, config.r2BucketName, metadata.objectKey.replace(/\.dump\.enc$/, ".dump.enc.crypto.json"), cryptoPath);
    const encryptedSha256 = await sha256File(encryptedPath);
    if (encryptedSha256 !== metadata.encryptedSha256) throw new Error("Checksum cifrado inválido");
    await decryptFile(encryptedPath, dumpPath, config.encryptionKey, cryptoPath);
    const dumpSha256 = await sha256File(dumpPath);
    if (dumpSha256 !== metadata.dumpSha256) throw new Error("Checksum dump inválido");
    console.log(JSON.stringify({ ok: true, backupId: metadata.backupId, objectKey: metadata.objectKey }, null, 2));
    return metadata;
  } finally {
    await cleanupTempDir(tempDir);
  }
}

if (require.main === module) {
  verifyExternalBackup().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
