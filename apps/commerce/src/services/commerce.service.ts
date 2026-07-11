import { apiRequest } from "@miclub/shared";
import {
  BusinessSettings,
  Collaborator,
  CreatedCollaborator,
  LoyaltyProgram,
  LoyaltyProgramDraft,
  ManualCustomer,
  ProgramType,
  RewardStatus,
  BillingSummary,
} from "../types/commerce";

let businessId: string | null = null;

async function id(): Promise<string> {
  if (businessId) return businessId;
  const rows = await apiRequest<any[]>("/business/mine");
  if (!rows.length) throw new Error("No tienes un comercio asignado");
  const nextId = rows[0].business.id as string;
  businessId = nextId;
  return nextId;
}

const typeMap: Record<ProgramType, string> = {
  stamps: "purchase_count",
  points: "points",
  cashback: "amount_spent",
  visits: "visit_count",
  amount: "amount_spent",
};

function mapProgram(p: any): LoyaltyProgram {
  return {
    id: p.id,
    version: p.version,
    type:
      p.accumulationType === "VISIT_COUNT"
        ? "visits"
        : p.accumulationType === "POINTS"
          ? "points"
          : p.accumulationType === "AMOUNT_SPENT"
            ? "amount"
            : "stamps",
    earningRule:
      p.accumulationType === "VISIT_COUNT"
        ? "Cada visita suma 1"
        : p.accumulationType === "AMOUNT_SPENT"
          ? "Cada monto acumulado avanza directamente"
          : "Cada compra suma 1",
    goal: Number(p.targetValue),
    goalLabel: `${Number(p.targetValue)} ${
      p.accumulationType === "VISIT_COUNT"
        ? "visitas"
        : p.accumulationType === "POINTS"
          ? "puntos"
          : "compras"
    }`,
    reward: p.rewardDescription,
    validity: p.rewardExpirationDays ? (String(p.rewardExpirationDays) as LoyaltyProgram["validity"]) : "none",
    status: p.status.toLowerCase(),
  };
}

function programPayload(b: string, d: LoyaltyProgramDraft | LoyaltyProgram) {
  return {
    business_id: b,
    name: d.goalLabel,
    accumulation_type: typeMap[d.type],
    target_value: d.goal,
    reward_description: d.reward,
    reward_expiration_days: d.validity === "none" ? undefined : Number(d.validity),
  };
}

export const commerceService = {
  async getBusinessDashboard() {
    const b = await id();
    const d = await apiRequest<any>(`/business/dashboard?business_id=${b}`);
    return {
      registeredCustomers: d.customers_registered,
      transactions: d.transactions_registered,
      rewardsGenerated: d.rewards_generated,
      rewardsRedeemed: d.rewards_redeemed,
      newCustomersToday: d.new_customers,
      activeCustomers: d.customers_registered,
      activeProgram: d.active_program?.name,
    };
  },
  async getBusinessSettings(): Promise<BusinessSettings> {
    const b = await id();
    const s = await apiRequest<any>(`/business/settings?business_id=${b}`);
    return { id: s.id, name: s.name, category: s.businessType, rut: s.rutBusiness, address: s.address, region: s.region, commune: s.commune, phone: s.phone, email: s.email, logoUrl: s.logoUrl };
  },
  async updateBusinessSettings(v: BusinessSettings) {
    const b = await id();
    await apiRequest(`/business/settings?business_id=${b}`, { method: "PATCH", body: JSON.stringify({ name: v.name, business_type: v.category, address: v.address, region: v.region, commune: v.commune, phone: v.phone, email: v.email, logo_url: v.logoUrl }) });
    return v;
  },
  async createLoyaltyProgram(d: LoyaltyProgramDraft) {
    const b = await id();
    return mapProgram(await apiRequest("/business/loyalty-programs", { method: "POST", body: JSON.stringify(programPayload(b, d)) }));
  },
  async getLoyaltyProgram() {
    const b = await id();
    try {
      return mapProgram(await apiRequest(`/business/loyalty-programs/active?business_id=${b}`));
    } catch (e) {
      if (e instanceof Error && e.message.includes("no tiene")) return null;
      throw e;
    }
  },
  async updateLoyaltyProgram(p: LoyaltyProgram) {
    const b = await id();
    return mapProgram(await apiRequest(`/business/loyalty-programs/${p.id}`, { method: "PATCH", body: JSON.stringify(programPayload(b, p)) }));
  },
  async archiveLoyaltyProgram(programId: string) {
    const b = await id();
    return mapProgram(await apiRequest(`/business/loyalty-programs/${programId}?business_id=${b}`, { method: "DELETE" }));
  },
  async getBusinessCustomers(q = "") {
    const b = await id();
    const rows = await apiRequest<any[]>(`/business/customers?business_id=${b}&q=${encodeURIComponent(q)}`);
    return rows.map((c) => ({ ...c, lastVisit: new Date(c.lastVisit).toLocaleString("es-CL"), history: [] }));
  },
  async getCustomerDetail(customerId: string) {
    const b = await id();
    const d = await apiRequest<any>(`/business/customers/${customerId}?business_id=${b}`);
    const active = d.cycles[0];
    return { id: d.customer.id, name: d.customer.name, phone: d.customer.phone, progress: active ? `${Number(active.currentValue)} de ${Number(active.targetValue)}` : "Sin ciclo", rewardsAvailable: d.rewards.filter((r: any) => r.status === "AVAILABLE").length, lastVisit: d.history[0] ? new Date(d.history[0].createdAt).toLocaleString("es-CL") : "Sin actividad", history: d.history.map((t: any) => `${t.status === "CANCELLED" ? "Anulada" : "Transacción"} · +${Number(t.valueAdded)}`), membershipStatus: d.membership.status };
  },
  async updateCustomerStatus(customerId: string, status: "ACTIVE" | "INACTIVE") {
    const b = await id();
    return apiRequest(`/business/customers/${customerId}/status?business_id=${b}`, { method: "PATCH", body: JSON.stringify({ status }) });
  },
  async getCollaborators(): Promise<Collaborator[]> {
    const b = await id();
    const rows = await apiRequest<any[]>(`/business/collaborators?business_id=${b}`);
    return rows.map((m) => ({ id: m.id, name: m.user.name, email: m.user.email, role: m.role, status: m.status === "ACTIVE" ? "active" : "inactive" }) as Collaborator);
  },
  async createCollaborator(input: Omit<Collaborator, "id" | "status"> & { password: string }): Promise<CreatedCollaborator> {
    const b = await id();
    const m = await apiRequest<any>(`/business/collaborators?business_id=${b}`, { method: "POST", body: JSON.stringify(input) });
    return { id: m.id, name: m.user.name, email: m.user.email, role: m.role, status: "active", temporaryPassword: m.temporary_password };
  },
  async updateCollaborator(v: Collaborator) {
    const b = await id();
    const m = await apiRequest<any>(`/business/collaborators/${v.id}?business_id=${b}`, { method: "PATCH", body: JSON.stringify({ role: v.role, status: v.status.toUpperCase() }) });
    return { id: m.id, name: m.user.name, email: m.user.email, role: m.role, status: m.status === "ACTIVE" ? "active" : "inactive" } as Collaborator;
  },
  async getRewards(status?: RewardStatus) {
    const b = await id();
    const rows = await apiRequest<any[]>(`/business/rewards?business_id=${b}${status ? `&status=${status}` : ""}`);
    return rows.map((r) => ({ id: r.id, customer: r.customer.name, description: r.rewardDescription, program: r.cycle.loyaltyProgram.name, generatedAt: new Date(r.generatedAt).toLocaleDateString("es-CL"), expiresAt: r.expiresAt ? new Date(r.expiresAt).toLocaleDateString("es-CL") : "Sin vencimiento", status: r.status === "REDEEMED" ? "redeemed" : r.status.toLowerCase() }));
  },
  async updateReward(rewardId: string, input: { description?: string; expiresAt?: string }) {
    const b = await id();
    return apiRequest(`/business/rewards/${rewardId}`, { method: "PATCH", body: JSON.stringify({ business_id: b, reward_description: input.description, expires_at: input.expiresAt }) });
  },
  async cancelReward(rewardId: string) {
    const b = await id();
    return apiRequest(`/business/rewards/${rewardId}`, { method: "DELETE", body: JSON.stringify({ business_id: b }) });
  },
  async getQRMaterial() {
    const b = await id();
    return apiRequest(`/business/qr-material?business_id=${b}`);
  },
  async getBilling(): Promise<BillingSummary> {
    const b = await id();
    return apiRequest(`/business/billing?business_id=${b}`);
  },
  async requestPlanChange(planId: string | undefined, reason: string) {
    const b = await id();
    return apiRequest(`/business/billing/change-request?business_id=${b}`, { method: "POST", body: JSON.stringify({ requested_plan_id: planId, reason }) });
  },
  async requestBillingCancel(reason: string) {
    const b = await id();
    return apiRequest(`/business/billing/cancel-request?business_id=${b}`, { method: "POST", body: JSON.stringify({ reason }) });
  },
  async getManualCustomers(q = "", filter = "all"): Promise<ManualCustomer[]> {
    const b = await id();
    return apiRequest(`/manual-customers?business_id=${b}&q=${encodeURIComponent(q)}&filter=${filter}`);
  },
  async getManualCustomer(customerId: string): Promise<ManualCustomer> {
    const b = await id();
    return apiRequest(`/manual-customers/${customerId}?business_id=${b}`);
  },
  async createManualCustomer(data: any): Promise<ManualCustomer> {
    const b = await id();
    return apiRequest("/manual-customers", { method: "POST", body: JSON.stringify({ ...data, business_id: b }) });
  },
  async updateManualCustomer(customerId: string, data: any): Promise<ManualCustomer> {
    const b = await id();
    return apiRequest(`/manual-customers/${customerId}?business_id=${b}`, { method: "PATCH", body: JSON.stringify(data) });
  },
  async addManualMovement(customerId: string, type: "STAMP" | "PURCHASE" | "POINTS", value?: number) {
    const b = await id();
    return apiRequest(`/manual-customers/${customerId}/movements`, { method: "POST", body: JSON.stringify({ business_id: b, type, value }) });
  },
  async redeemManualBenefit(customerId: string, note?: string) {
    const b = await id();
    return apiRequest(`/manual-customers/${customerId}/redeem`, { method: "POST", body: JSON.stringify({ business_id: b, note }) });
  },
  async deleteManualCustomer(customerId: string) {
    const b = await id();
    return apiRequest(`/manual-customers/${customerId}?business_id=${b}`, { method: "DELETE" });
  },
  reset() {
    businessId = null;
  },
};
