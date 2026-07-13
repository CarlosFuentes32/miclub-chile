import { buildR2Client, computeRetentionPlan, deleteObject, listObjects, loadBackupConfig } from "./backup-utils";

export async function runRetention() {
  const config = loadBackupConfig();
  const dryRun = process.env.BACKUP_RETENTION_DRY_RUN !== "false";
  if (config.environment === "production" && !dryRun) throw new Error("Retención productiva real bloqueada en RC-B1");
  const prefix = `${config.environment}/`;
  const client = buildR2Client(config);
  const objects = await listObjects(client, config.r2BucketName, prefix);
  const candidates = objects
    .filter((object) => object.key.endsWith(".dump.enc") || object.key.endsWith(".metadata.json"))
    .map((object) => ({
      key: object.key,
      lastModified: object.lastModified,
      retentionClass: object.key.includes("/01/") ? "monthly" as const : undefined,
    }));
  const plan = computeRetentionPlan(candidates, new Date(), dryRun);
  if (!dryRun) for (const key of plan.deleteKeys) await deleteObject(client, config.r2BucketName, key);
  console.log(JSON.stringify({ ok: true, environment: config.environment, ...plan }, null, 2));
  return plan;
}

if (require.main === module) {
  runRetention().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
