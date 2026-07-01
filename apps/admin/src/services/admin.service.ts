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
} from "../types/admin";
import { settingsMock, ticketsMock } from "../data/admin.mock";
export const adminService = {
  getAdminDashboard: () => apiRequest<any>("/admin/dashboard"),
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
  async updateBusinessStatus(id: string, status: BusinessStatus) {
    await apiRequest(`/admin/businesses/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    return this.getBusinessDetail(id);
  },
  deleteBusiness: (id: string) => apiRequest(`/admin/businesses/${id}`, { method: "DELETE" }),
  async getUsers(status='all'): Promise<AdminUser[]> {
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
      deletedAt:u.deletedAt?new Date(u.deletedAt).toLocaleString('es-CL'):undefined,
      deletedBy:u.deletedBy,
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
      deletedAt:u.deletedAt?new Date(u.deletedAt).toLocaleString('es-CL'):undefined,
      deletedBy:u.deletedBy,
    } as AdminUser;
  },
  async updateUserStatus(id: string, status: UserStatus) {
    await apiRequest(`/admin/users/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    return this.getUserDetail(id);
  },
  updateUser: (id: string, input: Partial<AdminUser>) => apiRequest(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  changeUserPassword: (id: string, password: string) => apiRequest(`/admin/users/${id}/password`, { method: "PATCH", body: JSON.stringify({ password }) }),
  getSupportUsers: (role:string) => apiRequest<SupportUser[]>(`/admin/support/${role}`),
  resetSupportPassword: (id:string) => apiRequest<{temporaryPassword:string}>(`/admin/support/users/${id}/reset-password`,{method:'POST'}),
  unlockSupportUser: (id:string) => apiRequest(`/admin/support/users/${id}/unlock`,{method:'POST'}),
  correctSupportRut: (id:string,rut:string) => apiRequest(`/admin/support/users/${id}/rut`,{method:'PATCH',body:JSON.stringify({rut,confirmed:true})}),
  getUserHistory: (id:string) => apiRequest<UserChange[]>(`/admin/support/users/${id}/history`),
  deleteUser: (id: string) => apiRequest(`/admin/users/${id}`, { method: "DELETE" }),
  reactivateUser: (id:string) => apiRequest(`/admin/users/${id}/reactivate`,{method:'POST'}),
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
  getReports: () => apiRequest<any>("/admin/reports"),
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
