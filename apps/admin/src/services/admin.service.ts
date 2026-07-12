import { apiRequest } from "@miclub/shared";
import {
  AdminBusiness,
  AdminUser,
  BusinessStatus,
  CreateBusinessInput,
  GlobalSettings,
  Plan,
  UserStatus,
  SupportUser,
  UserChange,
  SuperDashboard,
  AuditLog,
  BillingPayment,
  BillingSubscription,
  Incident,
  IncidentSeverity,
  IncidentStatus,
  BackupOverview,
  BackupRecord,
  BackupType,
  RestoreRecord,
  RollbackPlan,
  UpdateBusinessInput,
  SystemStatus,
  Paginated,
  SystemError,
} from "../types/admin";
import { settingsMock, ticketsMock } from "../data/admin.mock";
export const adminService = {
  getAdminDashboard: () => apiRequest<any>("/admin/dashboard"),
  getSuperDashboard: () => apiRequest<SuperDashboard>("/admin/super/dashboard"),
  getSystemStatus: () => apiRequest<SystemStatus>("/admin/system-status"),
  getIncidents: (params: Record<string, string> = {}) =>
    apiRequest<Incident[]>(
      `/admin/incidents?${new URLSearchParams(params).toString()}`,
    ),
  getIncidentDetail: (id: string) =>
    apiRequest<Incident>(`/admin/incidents/${id}`),
  updateIncidentStatus: (id: string, status: IncidentStatus, note?: string) =>
    apiRequest<Incident>(`/admin/incidents/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, note }),
    }),
  addIncidentNote: (id: string, note: string) =>
    apiRequest<Incident>(`/admin/incidents/${id}/notes`, {
      method: "POST",
      body: JSON.stringify({ note }),
    }),
  simulateIncident: (service: string, severity: IncidentSeverity) =>
    apiRequest<Incident>("/admin/incidents/simulate", {
      method: "POST",
      body: JSON.stringify({ service, severity }),
    }),
  resolveIncidentSimulation: (service: string) =>
    apiRequest<Incident>("/admin/incidents/simulate/resolve", {
      method: "POST",
      body: JSON.stringify({ service }),
    }),
  getBackupOverview: () => apiRequest<BackupOverview>("/admin/backups/overview"),
  getBackups: () => apiRequest<BackupRecord[]>("/admin/backups"),
  createBackup: (input: { type: BackupType; reason?: string; beforeOperation?: string }) =>
    apiRequest<BackupRecord>("/admin/backups", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  validateLatestBackup: () =>
    apiRequest<BackupRecord>("/admin/backups/validate-latest", { method: "POST" }),
  createRestoreDrill: (input: {
    backupId?: string;
    targetEnvironment: string;
    temporaryDatabaseRef: string;
    reason: string;
    confirmedTemporaryRestore: boolean;
  }) =>
    apiRequest<RestoreRecord>("/admin/backups/restores", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  createRollbackPlan: (input: {
    reason: string;
    toCommit?: string;
    backupId?: string;
    includeDatabase?: boolean;
    includeVariables?: boolean;
  }) =>
    apiRequest<RollbackPlan>("/admin/backups/rollbacks", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  simulateBackupRecovery: () =>
    apiRequest<{ backup: BackupRecord; restore: RestoreRecord; rollback: RollbackPlan }>(
      "/admin/backups/simulate",
      { method: "POST" },
    ),
  createBusiness: (input: CreateBusinessInput) =>
    apiRequest<{ business: { id: string }; owner: { email: string } }>(
      "/admin/businesses",
      { method: "POST", body: JSON.stringify(input) },
    ),
  async getBusinesses(): Promise<AdminBusiness[]> {
    const rows = await apiRequest<any[]>("/admin/businesses");
    return rows.map((b) => ({
      ...b,
      lastUse: b.lastUse
        ? new Date(b.lastUse).toLocaleString("es-CL")
        : "Sin actividad",
    }));
  },
  getBusinessDetail: (id: string) =>
    apiRequest<AdminBusiness>(`/admin/businesses/${id}`),
  async updateBusiness(id: string, input: UpdateBusinessInput) {
    await apiRequest(`/admin/businesses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
    return this.getBusinessDetail(id);
  },
  async updateBusinessStatus(id: string, status: BusinessStatus) {
    await apiRequest(`/admin/businesses/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    return this.getBusinessDetail(id);
  },
  deleteBusiness: (id: string) =>
    apiRequest(`/admin/businesses/${id}`, { method: "DELETE" }),
  restoreBusiness: (id: string) =>
    apiRequest(`/admin/businesses/${id}/restore`, { method: "POST" }),
  getBusinessFull: (id: string) =>
    apiRequest<any>(`/admin/businesses/${id}/full`),
  getCustomers: (q = "") =>
    apiRequest<any[]>(`/admin/customers?q=${encodeURIComponent(q)}`),
  getCashiers: (businessId = "", q = "") =>
    apiRequest<any[]>(
      `/admin/cashiers?businessId=${encodeURIComponent(businessId)}&q=${encodeURIComponent(q)}`,
    ),
  getCustomerFull: (id: string) =>
    apiRequest<any>(`/admin/customers/${id}/full`),
  adjustCustomer: (
    id: string,
    input: { businessId: string; type: string; value: number; reason: string },
  ) =>
    apiRequest(`/admin/customers/${id}/adjust`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  grantManualReward: (
    id: string,
    input: { businessId: string; description: string; reason: string },
  ) =>
    apiRequest(`/admin/customers/${id}/manual-reward`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  async getUsers(status = "all"): Promise<AdminUser[]> {
    const rows = await apiRequest<any[]>(`/admin/users?status=${status}`);
    return rows.map((u) => ({
      id: u.id,
      name: u.name,
      phone: u.phone,
      email: u.email,
      role: u.role,
      status: u.status.toLowerCase(),
      createdAt: new Date(u.createdAt).toLocaleDateString("es-CL"),
      business: u.businessMemberships[0]?.business.name,
      lastAccess: "No disponible",
      deletedAt: u.deletedAt
        ? new Date(u.deletedAt).toLocaleString("es-CL")
        : undefined,
      deletedBy: u.deletedBy,
    }));
  },
  getUserDetail: async (id: string) => {
    const u = await apiRequest<any>(`/admin/users/${id}`);
    return {
      id: u.id,
      name: u.name,
      phone: u.phone,
      email: u.email,
      role: u.role,
      status: u.status.toLowerCase(),
      createdAt: new Date(u.createdAt).toLocaleDateString("es-CL"),
      business: u.businessMemberships[0]?.business.name,
      lastAccess: "No disponible",
      deletedAt: u.deletedAt
        ? new Date(u.deletedAt).toLocaleString("es-CL")
        : undefined,
      deletedBy: u.deletedBy,
    } as AdminUser;
  },
  async updateUserStatus(id: string, status: UserStatus) {
    await apiRequest(`/admin/users/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    return this.getUserDetail(id);
  },
  updateUser: (id: string, input: Partial<AdminUser>) =>
    apiRequest(`/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  changeUserPassword: (id: string, password: string) =>
    apiRequest(`/admin/users/${id}/password`, {
      method: "PATCH",
      body: JSON.stringify({ password }),
    }),
  getSupportUsers: (role: string) =>
    apiRequest<SupportUser[]>(`/admin/support/${role}`),
  resetSupportPassword: (id: string) =>
    apiRequest<{ temporaryPassword: string }>(
      `/admin/support/users/${id}/reset-password`,
      { method: "POST" },
    ),
  unlockSupportUser: (id: string) =>
    apiRequest(`/admin/support/users/${id}/unlock`, { method: "POST" }),
  correctSupportRut: (id: string, rut: string) =>
    apiRequest(`/admin/support/users/${id}/rut`, {
      method: "PATCH",
      body: JSON.stringify({ rut, confirmed: true }),
    }),
  getUserHistory: (id: string) =>
    apiRequest<UserChange[]>(`/admin/support/users/${id}/history`),
  getSupportNotes: (id: string) =>
    apiRequest<any[]>(`/admin/support/users/${id}/notes`),
  addSupportNote: (id: string, note: string) =>
    apiRequest(`/admin/support/users/${id}/notes`, {
      method: "POST",
      body: JSON.stringify({ note }),
    }),
  startImpersonation: (targetId: string, reason: string) =>
    apiRequest<any>(`/admin/impersonation/${targetId}`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  deleteUser: (id: string) =>
    apiRequest(`/admin/users/${id}`, { method: "DELETE" }),
  reactivateUser: (id: string) =>
    apiRequest(`/admin/users/${id}/reactivate`, { method: "POST" }),
  getPlans: () => apiRequest<Plan[]>("/admin/plans"),
  createPlan: (p: Omit<Plan, "id">) =>
    apiRequest<Plan>("/admin/plans", {
      method: "POST",
      body: JSON.stringify(p),
    }),
  updatePlan: (p: Plan) =>
    apiRequest<Plan>(`/admin/plans/${p.id}`, {
      method: "PATCH",
      body: JSON.stringify(p),
    }),
  getBillingSubscriptions: (status = "all") =>
    apiRequest<BillingSubscription[]>(`/admin/billing/subscriptions?status=${status}`),
  getBillingPayments: (status = "all") =>
    apiRequest<BillingPayment[]>(`/admin/billing/payments?status=${status}`),
  registerManualPayment: (input: {
    businessId: string;
    planId: string;
    amount: number;
    reference: string;
    reason: string;
    paymentMethod?: string;
  }) =>
    apiRequest<BillingPayment>("/admin/billing/payments/manual", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  changeSubscriptionPlan: (businessId: string, planId: string, reason: string) =>
    apiRequest(`/admin/billing/subscriptions/${businessId}/plan`, {
      method: "PATCH",
      body: JSON.stringify({ planId, reason }),
    }),
  grantTrial: (businessId: string, days: number, reason: string) =>
    apiRequest(`/admin/billing/subscriptions/${businessId}/trial`, {
      method: "POST",
      body: JSON.stringify({ days, reason }),
    }),
  suspendSubscription: (businessId: string, reason: string) =>
    apiRequest(`/admin/billing/subscriptions/${businessId}/suspend`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  reactivateSubscription: (businessId: string, reason: string) =>
    apiRequest(`/admin/billing/subscriptions/${businessId}/reactivate`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  getReports: () => apiRequest<any>("/admin/reports"),
  getAuditLogs: (params: Record<string, string>) =>
    apiRequest<Paginated<AuditLog>>(
      `/admin/audit?${new URLSearchParams(params).toString()}`,
    ),
  getAuditDetail: (id: string) => apiRequest<AuditLog>(`/admin/audit/${id}`),
  exportAudit: (params: Record<string, string>) =>
    apiRequest<{ filename: string; rows: number; csv: string; filters: Record<string, unknown> }>(
      `/admin/audit/export?${new URLSearchParams(params).toString()}`,
    ),
  auditRetentionDryRun: () => apiRequest<any>("/admin/audit/retention/dry-run"),
  getSystemErrors: (params: Record<string, string>) =>
    apiRequest<Paginated<SystemError>>(
      `/admin/errors?${new URLSearchParams(params).toString()}`,
    ),
  getSystemErrorDetail: (id: string) => apiRequest<SystemError>(`/admin/errors/${id}`),
  updateSystemErrorStatus: (id: string, status: SystemError["status"], note: string) =>
    apiRequest<SystemError>(`/admin/errors/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, note }),
    }),
  getSuperGlobalSettings: () => apiRequest<any>("/admin/global-settings"),
  updateSuperGlobalSettings: (value: any) =>
    apiRequest<any>("/admin/global-settings", {
      method: "PATCH",
      body: JSON.stringify(value),
    }),
  getMaintenance: () => apiRequest<any>("/admin/maintenance"),
  exportData: (entity: string) => apiRequest<any[]>(`/admin/export/${entity}`),
  async getSupportTickets() {
    return structuredClone(ticketsMock);
  },
  async getGlobalSettings() {
    return structuredClone(settingsMock);
  },
  async updateGlobalSettings(v: GlobalSettings) {
    return v;
  },
};
