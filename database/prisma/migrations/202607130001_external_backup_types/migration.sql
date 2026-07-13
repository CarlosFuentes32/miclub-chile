-- Non-destructive enum expansion for external backup catalog classification.
ALTER TYPE "BackupType" ADD VALUE IF NOT EXISTS 'provider_managed';
ALTER TYPE "BackupType" ADD VALUE IF NOT EXISTS 'external_logical';
ALTER TYPE "BackupType" ADD VALUE IF NOT EXISTS 'restore_drill';
