import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { createReadStream, createWriteStream, promises as fs } from "node:fs";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { spawn } from "node:child_process";
import { PrismaClient } from "@prisma/client";

export type BackupEnvironment = "staging" | "production";
export type BackupStatus = "CREATED" | "UPLOADED" | "VERIFIED" | "FAILED";

export interface BackupConfig {
  environment: BackupEnvironment;
  databaseUrl: string;
  r2AccountId: string;
  r2AccessKeyId: string;
  r2SecretAccessKey: string;
  r2BucketName: string;
  r2Endpoint: string;
  r2Region: string;
  encryptionKey: Buffer;
  appVersion: string;
  commit: string;
  branch: string;
  tempRoot?: string;
  allowProductionBackup: boolean;
  allowTemporaryRestore: boolean;
}

export interface BackupMetadata {
  backupId: string;
  environment: BackupEnvironment;
  createdAt: string;
  databaseEngine: "postgresql";
  databaseVersion: string;
  pgDumpVersion: string;
  pgRestoreVersion?: string;
  applicationVersion: string;
  commit: string;
  branch?: string;
  format: "custom";
  encrypted: true;
  encryption: "AES-256-GCM";
  objectKey: string;
  metadataKey: string;
  sizeBytes: number;
  encryptedSizeBytes: number;
  dumpSha256: string;
  encryptedSha256: string;
  metadataSha256?: string;
  durationMs: number;
  status: BackupStatus;
  storageProvider: "cloudflare_r2";
  retentionClass: "daily" | "weekly" | "monthly";
  protected: boolean;
}

export interface RetentionCandidate {
  key: string;
  lastModified: Date;
  protected?: boolean;
  retentionClass?: "daily" | "weekly" | "monthly";
}

export interface RetentionPlan {
  dryRun: boolean;
  deleteKeys: string[];
  keepKeys: string[];
  protectedKeys: string[];
}

export const TABLES_TO_COMPARE = [
  "users",
  "businesses",
  "customers",
  "cashiers",
  "loyalty_programs",
  "rewards",
  "transactions",
  "auth_sessions",
  "audit_logs",
  "system_errors",
  "incidents",
  "backup_records",
  "support_tickets",
  "plans",
  "business_subscriptions",
  "billing_payments",
  "billing_financial_events",
] as const;

export function requiredEnv(name: string, source = process.env) {
  const value = source[name];
  if (!value) throw new Error(`Falta variable requerida: ${name}`);
  return value;
}

export function loadBackupConfig(source = process.env): BackupConfig {
  const environment = requiredEnv("BACKUP_ENVIRONMENT", source) as BackupEnvironment;
  if (!["staging", "production"].includes(environment)) throw new Error("BACKUP_ENVIRONMENT debe ser staging o production");
  if (environment === "production" && source.ALLOW_PRODUCTION_BACKUP !== "true") {
    throw new Error("Backup productivo bloqueado: define ALLOW_PRODUCTION_BACKUP=true solo con autorización explícita");
  }
  const databaseUrl = requiredEnv("DATABASE_URL", source);
  assertDatabaseAllowed(databaseUrl, environment, source.STAGING_DATABASE_CONFIRM);
  const r2BucketName = requiredEnv("R2_BUCKET_NAME", source);
  if (!/miclub.*backup/i.test(r2BucketName)) throw new Error("R2_BUCKET_NAME no parece un bucket dedicado de backups MiClub");
  return {
    environment,
    databaseUrl,
    r2AccountId: requiredEnv("R2_ACCOUNT_ID", source),
    r2AccessKeyId: requiredEnv("R2_ACCESS_KEY_ID", source),
    r2SecretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY", source),
    r2BucketName,
    r2Endpoint: source.R2_ENDPOINT || `https://${source.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    r2Region: source.R2_REGION || "auto",
    encryptionKey: parseEncryptionKey(requiredEnv("BACKUP_ENCRYPTION_KEY", source)),
    appVersion: source.APP_VERSION || "unknown",
    commit: source.GIT_COMMIT_SHA || source.GITHUB_SHA || "unknown",
    branch: source.GIT_BRANCH || source.GITHUB_REF_NAME || "unknown",
    tempRoot: source.BACKUP_TEMP_DIR,
    allowProductionBackup: source.ALLOW_PRODUCTION_BACKUP === "true",
    allowTemporaryRestore: source.ALLOW_TEMPORARY_RESTORE === "true",
  };
}

export function assertDatabaseAllowed(databaseUrl: string, environment: BackupEnvironment, stagingConfirm?: string) {
  if (!databaseUrl.startsWith("postgresql://") && !databaseUrl.startsWith("postgres://")) throw new Error("DATABASE_URL debe ser PostgreSQL");
  const parsed = new URL(databaseUrl);
  const descriptor = `${parsed.hostname}/${parsed.pathname}`.toLowerCase();
  if (environment === "staging") {
    if (!/staging|railway|postgres/.test(descriptor) && !stagingConfirm) throw new Error("Staging no confirmado para DATABASE_URL");
    if (/prod|production/.test(descriptor)) throw new Error("DATABASE_URL staging parece producción");
  }
}

export function parseEncryptionKey(raw: string) {
  const normalized = raw.startsWith("base64:") ? raw.slice("base64:".length) : raw;
  const key = Buffer.from(normalized, "base64");
  if (key.length !== 32) throw new Error("BACKUP_ENCRYPTION_KEY debe ser base64 de 32 bytes (256 bits)");
  return key;
}

export function sanitizeError(error: unknown) {
  return String(error instanceof Error ? error.message : error)
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "postgresql://[redacted]")
    .replace(/(DATABASE_URL|R2_SECRET_ACCESS_KEY|BACKUP_ENCRYPTION_KEY|R2_ACCESS_KEY_ID)=([^&\s"']+)/gi, "$1=[redacted]");
}

export function sha256File(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    createReadStream(path)
      .on("data", (chunk) => hash.update(chunk))
      .on("error", reject)
      .on("end", () => resolve(hash.digest("hex")));
  });
}

export function sha256Text(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function secureTempDir(prefix = "miclub-backup-") {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  try {
    await fs.chmod(dir, 0o700);
  } catch {
    // Windows may not support POSIX permissions; temp path randomness still applies.
  }
  return dir;
}

export async function cleanupTempDir(path: string) {
  await rm(path, { recursive: true, force: true });
}

export async function fileSize(path: string) {
  return (await stat(path)).size;
}

export async function encryptFile(inputPath: string, outputPath: string, key: Buffer) {
  await fs.mkdir(dirname(outputPath), { recursive: true });
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  await pipeline(createReadStream(inputPath), cipher, createWriteStream(outputPath));
  const authTag = cipher.getAuthTag();
  await fs.writeFile(`${outputPath}.crypto.json`, JSON.stringify({
    algorithm: "AES-256-GCM",
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  }, null, 2));
}

export async function decryptFile(inputPath: string, outputPath: string, key: Buffer, cryptoPath = `${inputPath}.crypto.json`) {
  const descriptor = JSON.parse(await fs.readFile(cryptoPath, "utf8")) as { iv: string; authTag: string };
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(descriptor.iv, "base64"));
  decipher.setAuthTag(Buffer.from(descriptor.authTag, "base64"));
  await pipeline(createReadStream(inputPath), decipher, createWriteStream(outputPath));
}

export function buildR2Client(config: BackupConfig) {
  return new S3Client({
    region: config.r2Region,
    endpoint: config.r2Endpoint,
    credentials: {
      accessKeyId: config.r2AccessKeyId,
      secretAccessKey: config.r2SecretAccessKey,
    },
  });
}

export async function uploadObject(client: S3Client, bucket: string, key: string, path: string, contentType = "application/octet-stream") {
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: createReadStream(path),
    ContentType: contentType,
  }));
}

export async function uploadJson(client: S3Client, bucket: string, key: string, payload: unknown) {
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: JSON.stringify(payload, null, 2),
    ContentType: "application/json",
  }));
}

export async function objectExists(client: S3Client, bucket: string, key: string) {
  await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  return true;
}

export async function downloadObject(client: S3Client, bucket: string, key: string, path: string) {
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!response.Body) throw new Error(`Objeto R2 sin contenido: ${key}`);
  await fs.mkdir(dirname(path), { recursive: true });
  await pipeline(response.Body as NodeJS.ReadableStream, createWriteStream(path));
}

export async function listObjects(client: S3Client, bucket: string, prefix: string) {
  const objects = [];
  let ContinuationToken: string | undefined;
  do {
    const page = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken }));
    for (const item of page.Contents ?? []) if (item.Key && item.LastModified) objects.push({ key: item.Key, lastModified: item.LastModified });
    ContinuationToken = page.NextContinuationToken;
  } while (ContinuationToken);
  return objects;
}

export async function deleteObject(client: S3Client, bucket: string, key: string) {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export function backupObjectKeys(environment: BackupEnvironment, backupId: string, date = new Date()) {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const base = `${environment}/${yyyy}/${mm}/${dd}/${backupId}`;
  return {
    dumpKey: `${base}.dump.enc`,
    cryptoKey: `${base}.dump.enc.crypto.json`,
    metadataKey: `metadata/${environment}/${yyyy}/${mm}/${dd}/${backupId}.metadata.json`,
  };
}

export function retentionClass(date = new Date()): "daily" | "weekly" | "monthly" {
  if (date.getUTCDate() === 1) return "monthly";
  if (date.getUTCDay() === 0) return "weekly";
  return "daily";
}

export function computeRetentionPlan(items: RetentionCandidate[], now = new Date(), dryRun = true): RetentionPlan {
  const sorted = [...items].sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
  const newest = sorted[0]?.key;
  const deleteKeys: string[] = [];
  const keepKeys: string[] = [];
  const protectedKeys: string[] = [];
  for (const item of sorted) {
    const ageDays = (now.getTime() - item.lastModified.getTime()) / 86_400_000;
    const limit = item.retentionClass === "monthly" ? 183 : item.retentionClass === "weekly" ? 56 : 14;
    if (item.key === newest || item.protected) {
      protectedKeys.push(item.key);
      keepKeys.push(item.key);
    } else if (ageDays > limit) {
      deleteKeys.push(item.key);
    } else {
      keepKeys.push(item.key);
    }
  }
  return { dryRun, deleteKeys, keepKeys, protectedKeys };
}

export async function runCommand(command: string, args: string[], env: NodeJS.ProcessEnv = process.env) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} falló con código ${code}: ${sanitizeError(stderr || stdout)}`));
    });
  });
}

export async function toolVersion(command: string) {
  const { stdout, stderr } = await runCommand(command, ["--version"]);
  return (stdout || stderr).trim();
}

export async function getDatabaseVersion(databaseUrl: string) {
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ version: string }>>("select version()");
    return rows[0]?.version ?? "unknown";
  } finally {
    await prisma.$disconnect();
  }
}

export async function getTableCounts(databaseUrl: string) {
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const counts: Record<string, number | "missing"> = {};
  try {
    for (const table of TABLES_TO_COMPARE) {
      try {
        const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`select count(*)::bigint as count from "${table}"`);
        counts[table] = Number(rows[0]?.count ?? 0);
      } catch {
        counts[table] = "missing";
      }
    }
  } finally {
    await prisma.$disconnect();
  }
  return counts;
}

export async function assertNonEmptyDatabase(databaseUrl: string) {
  const counts = await getTableCounts(databaseUrl);
  const users = counts.users;
  if (users === "missing" || users === 0) throw new Error("Base rechazada: tabla users ausente o vacía");
  return counts;
}

export function safeSummary(metadata: BackupMetadata) {
  return {
    backupId: metadata.backupId,
    environment: metadata.environment,
    objectKey: metadata.objectKey,
    metadataKey: metadata.metadataKey,
    sizeBytes: metadata.sizeBytes,
    encryptedSizeBytes: metadata.encryptedSizeBytes,
    status: metadata.status,
    durationMs: metadata.durationMs,
  };
}
