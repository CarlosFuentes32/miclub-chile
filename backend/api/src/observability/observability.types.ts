export type SystemCheckStatus = "ok" | "warning" | "error" | "unknown";

export interface SystemCheck {
  key: string;
  label: string;
  status: SystemCheckStatus;
  message: string;
  responseTimeMs?: number | null;
  metadata?: Record<string, unknown>;
}

export interface VersionInfo {
  version: string;
  commit: string;
  branch: string;
  buildNumber: string;
  buildTime: string;
  generatedAt: string;
}

export interface DeploymentInfo {
  provider: string;
  repository: string;
  branch: string;
  commit: string;
  environment: string;
  service: string;
  deploymentId: string;
}

export interface RuntimeInfo {
  nodeVersion: string;
  uptimeSeconds: number;
  memory: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
    externalMb: number;
  };
  responseTimeMs: number;
}

export interface EnterpriseHealth {
  status: "ok" | "degraded" | "down";
  service: "MiClub API";
  environment: string;
  summary: {
    ok: number;
    warning: number;
    error: number;
    unknown: number;
  };
  checks: Record<string, SystemCheck>;
  version: VersionInfo;
  deployment: DeploymentInfo;
  runtime: RuntimeInfo;
  lastPlaywright: {
    status: SystemCheckStatus;
    runId: string;
    runUrl: string;
    executedAt: string;
  };
  lastProductionSmoke?: Record<string, unknown>;
  lastProductionBackup?: Record<string, unknown>;
  lastRestoreDrill?: Record<string, unknown>;
  timestamp: string;
}
