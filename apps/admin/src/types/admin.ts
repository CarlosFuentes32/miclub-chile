export type BusinessStatus =
  "active" | "suspended" | "grace_period" | "cancelled" | "deleted";
export type UsageLevel = "frequent" | "low" | "inactive";
export type UserStatus = "active" | "suspended" | "deleted";
export type UserRole =
  | "CUSTOMER"
  | "CASHIER"
  | "BUSINESS_ADMIN"
  | "BUSINESS_OWNER"
  | "MICLUB_ADMIN"
  | "SUPER_ADMIN";
export interface AdminDashboard {
  activeBusinesses: number;
  registeredUsers: number;
  todayTransactions: number;
  rewardsGenerated: number;
  rewardsRedeemed: number;
  atRiskBusinesses: number;
  estimatedMonthlyRevenue: number;
}
export interface AdminBusiness {
  id: string;
  name: string;
  category: string;
  rut?: string;
  owner: string;
  phone: string;
  email: string;
  plan: string;
  status: BusinessStatus;
  customers: number;
  transactions: number;
  rewards: number;
  lastUse: string;
  usage: UsageLevel;
  activeProgram: string;
}
export interface CreateBusinessInput {
  name: string;
  businessType: string;
  rutBusiness?: string;
  address: string;
  region: string;
  commune: string;
  phone: string;
  email: string;
  planId: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerPassword: string;
}
export interface UpdateBusinessInput {
  name: string;
  businessType: string;
  rutBusiness?: string;
  phone: string;
  email: string;
  planId: string;
}
export interface AdminUser {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  business?: string;
  lastAccess: string;
  deletedAt?: string;
  deletedBy?: { id: string; name: string; email: string };
}
export interface Plan {
  id: string;
  name: string;
  monthlyPrice: number;
  currency?: string;
  billingPeriod?: "MONTHLY" | "YEARLY";
  trialDays?: number;
  customerLimit: number;
  collaboratorLimit: number;
  features: string[];
  active: boolean;
}
export interface BillingSubscription {
  id: string;
  businessId: string;
  business: { id: string; name: string; status: string };
  plan: Plan;
  status: string;
  trialEndsAt?: string;
  nextBillingAt?: string;
  currentPeriodEndsAt?: string;
  lastPaymentStatus?: string;
}
export interface BillingPayment {
  id: string;
  business: { id: string; name: string };
  amount: number;
  currency: string;
  status: string;
  provider: string;
  paidAt?: string;
  periodStart?: string;
  periodEnd?: string;
  paymentMethod?: string;
  reference?: string;
}
export interface Reports {
  newBusinesses: number;
  newUsers: number;
  monthlyTransactions: number;
  rewardsGenerated: number;
  rewardsRedeemed: number;
  activeBusinesses: number;
  suspendedBusinesses: number;
}
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export interface SupportTicket {
  id: string;
  business: string;
  user: string;
  subject: string;
  status: TicketStatus;
  priority: "low" | "medium" | "high";
  createdAt: string;
}
export interface GlobalSettings {
  categories: string[];
  programTypes: string[];
  statuses: string[];
  globalTexts: { welcome: string; support: string };
}
export interface SupportUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  rut?: string;
  role: UserRole;
  status: string;
  forcePasswordChange: boolean;
  lockedAt?: string;
  birthDate?: string;
  businessMemberships?: { business: { name: string } }[];
}
export interface UserChange {
  id: string;
  field: string;
  action: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
  actor?: { name: string; email: string };
}
export interface SuperDashboard {
  totalBusinesses: number;
  activeBusinesses: number;
  suspendedBusinesses: number;
  deletedBusinesses: number;
  totalCustomers: number;
  totalCashiers: number;
  totalAdmins: number;
  activePrograms: number;
  totalPurchases: number;
  totalRedeems: number;
  rewardsDelivered: number;
  activityToday: number;
  activityWeek: number;
  topBusinesses: Array<{
    id: string;
    name: string;
    status: string;
    transactions: number;
    rewards: number;
    customers: number;
  }>;
  topCustomers: Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    transactions: number;
    rewards: number;
  }>;
}
export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  environment: string;
  actorRole?: string;
  category: string;
  module: string;
  result: "SUCCESS" | "FAILURE" | "DENIED" | "PARTIAL";
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  previousState?: Record<string, unknown>;
  nextState?: Record<string, unknown>;
  requestId?: string;
  correlationId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  durationMs?: number;
  version?: string;
  commit?: string;
  buildNumber?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  user?: { name: string; email: string; role: UserRole };
  business?: { name: string };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SystemError {
  id: string;
  fingerprint: string;
  environment: string;
  service: string;
  module?: string;
  type: string;
  message: string;
  sanitizedStack?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  firstSeenAt: string;
  lastSeenAt: string;
  occurrenceCount: number;
  requestId?: string;
  correlationId?: string;
  role?: string;
  businessId?: string;
  version?: string;
  commit?: string;
  buildNumber?: string;
  status: "OPEN" | "INVESTIGATING" | "RESOLVED";
  incidentId?: string;
  notes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export type SystemCheckStatus = "ok" | "warning" | "error" | "unknown";

export interface SystemCheck {
  key: string;
  label: string;
  status: SystemCheckStatus;
  message: string;
  responseTimeMs?: number | null;
  metadata?: Record<string, unknown>;
}

export interface SystemStatus {
  status: "ok" | "degraded" | "down";
  service: "MiClub API";
  environment: string;
  summary: Record<SystemCheckStatus, number>;
  checks: Record<string, SystemCheck>;
  version: {
    version: string;
    commit: string;
    branch: string;
    buildNumber: string;
    buildTime: string;
    generatedAt: string;
  };
  deployment: {
    provider: string;
    repository: string;
    branch: string;
    commit: string;
    environment: string;
    service: string;
    deploymentId: string;
  };
  runtime: {
    nodeVersion: string;
    uptimeSeconds: number;
    memory: {
      rssMb: number;
      heapUsedMb: number;
      heapTotalMb: number;
      externalMb: number;
    };
    responseTimeMs: number;
  };
  lastPlaywright: {
    status: SystemCheckStatus;
    runId: string;
    runUrl: string;
    executedAt: string;
  };
  timestamp: string;
}

export type IncidentSeverity = "CRITICAL" | "HIGH" | "MEDIUM";
export type IncidentStatus =
  | "DETECTED"
  | "INVESTIGATING"
  | "IDENTIFIED"
  | "MONITORING"
  | "RESOLVED";
export type IncidentActionType =
  | "DETECTED"
  | "STATUS_CHANGED"
  | "NOTE_ADDED"
  | "ALERT_SENT"
  | "ALERT_SUPPRESSED"
  | "RECOVERY_DETECTED"
  | "RESOLVED";
export type IncidentAlertChannel = "EMAIL" | "SLACK" | "WHATSAPP";

export interface IncidentAction {
  id: string;
  incidentId: string;
  actorUserId?: string;
  action: IncidentActionType;
  note?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface IncidentAlert {
  id: string;
  incidentId: string;
  channel: IncidentAlertChannel;
  status: string;
  recipient?: string;
  message?: string;
  providerId?: string;
  sentAt?: string;
  createdAt: string;
}

export interface Incident {
  id: string;
  dedupeKey: string;
  title: string;
  service: string;
  environment: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  startedAt: string;
  recoveredAt?: string;
  closedAt?: string;
  lastAlertAt?: string;
  alertCooldownUntil?: string;
  deployedVersion?: string;
  commit?: string;
  summary: string;
  technicalDetail?: string;
  source: string;
  finalStatus?: string;
  durationSeconds?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  actions?: IncidentAction[];
  alerts?: IncidentAlert[];
}

export type BackupType =
  | "AUTOMATIC"
  | "MANUAL"
  | "SCHEDULED"
  | "PRE_DEPLOY"
  | "PRE_MIGRATION"
  | "PRE_RESTORE"
  | "PRE_DATA_CLEANUP"
  | "SIMULATION";
export type BackupStatus = "REQUESTED" | "RUNNING" | "VERIFIED" | "FAILED" | "EXPIRED";
export type RestoreStatus = "REQUESTED" | "VALIDATING" | "VALIDATED" | "FAILED" | "BLOCKED";
export type RollbackStatus = "PLANNED" | "VALIDATED" | "BLOCKED" | "COMPLETED" | "FAILED";

export interface BackupRecord {
  id: string;
  environment: string;
  databaseName: string;
  version: string;
  commit: string;
  branch?: string;
  responsibleName?: string;
  type: BackupType;
  status: BackupStatus;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  sizeBytes?: number;
  checksum?: string;
  result?: string;
  storageProvider: string;
  storageRef?: string;
  validation?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  restores?: RestoreRecord[];
}

export interface RestoreRecord {
  id: string;
  backupId?: string;
  environment: string;
  targetEnvironment: string;
  temporaryDatabaseRef?: string;
  requestedByName?: string;
  status: RestoreStatus;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  validation?: Record<string, unknown>;
  result?: string;
  safetyNotes?: string;
  backup?: BackupRecord;
}

export interface RollbackPlan {
  id: string;
  environment: string;
  requestedByName?: string;
  status: RollbackStatus;
  reason: string;
  fromCommit?: string;
  toCommit?: string;
  backupId?: string;
  validation?: Record<string, unknown>;
  result?: string;
  createdAt: string;
}

export interface BackupOverview {
  environment: string;
  strategy: {
    providerBackups: string;
    appCatalog: string;
    restorePolicy: string;
  };
  lastBackup?: BackupRecord;
  lastRestore?: RestoreRecord;
  lastRollback?: RollbackPlan;
  backups: BackupRecord[];
  restores: RestoreRecord[];
  rollbacks: RollbackPlan[];
}

export interface SecurityDashboard {
  since: string;
  summary: {
    failedLogins: number;
    denied: number;
    lockedUsers: number;
    activeSessions: number;
    revokedSessions: number;
    impersonations: number;
    exports: number;
    passwordChanges: number;
    rateLimits: number;
  };
  rateLimitPolicy: Record<string, unknown>;
  securityConfiguration: Record<string, boolean>;
  riskEvents: AuditLog[];
  recentSessions: Array<{
    id: string;
    user: { id: string; name: string; email: string; role: UserRole; status: string };
    createdAt: string;
    lastUsedAt?: string;
    expiresAt: string;
    revokedAt?: string;
    revokedReason?: string;
    deviceLabel?: string;
    ipHash?: string;
    reuseDetectedAt?: string;
  }>;
}
