import { apiRequest } from "@miclub/shared";
import {
  CashierCustomer,
  CashierReward,
  TransactionResult,
} from "../types/cashier";
let businessId: string | null = null;
let businessName: string | null = null;
const cache = new Map<string, CashierCustomer>();
async function currentBusiness() {
  if (businessId) return businessId;
  const memberships = await apiRequest<any[]>("/business/mine");
  if (!memberships.length) throw new Error("No tienes un comercio asignado");
  businessId = memberships[0].business.id;
  businessName = memberships[0].business.name;
  return businessId;
}
function mapSnapshot(s: any): CashierCustomer {
  const customer: CashierCustomer = {
    id: s.customer.id,
    name: s.customer.name,
    phone: s.customer.phone,
    business: s.business.name,
    current: Number(s.progress.current),
    goal: Number(s.progress.target),
    nextReward: s.next_reward,
    rewards: s.rewards_available.map((r: any) => ({
      id: r.id,
      title: r.description,
      business: s.business.name,
      status: "available",
    })),
    lastTransaction: s.last_transaction
      ? {
          id: s.last_transaction.id,
          createdAt: s.last_transaction.created_at,
          cancellableUntil: new Date(Date.now() + 10 * 60_000).toISOString(),
          status:
            s.last_transaction.status === "VALID" ? "completed" : "cancelled",
        }
      : undefined,
  };
  cache.set(customer.id, customer);
  return customer;
}
async function refresh(customer: CashierCustomer) {
  const found = await cashierService.searchCustomerByPhone(customer.phone);
  return found ?? customer;
}
export const cashierService = {
  async getBusinessName(){await currentBusiness();return businessName??"Comercio"},
  async listManualCustomers(q='',filter='all'){const id=await currentBusiness();return apiRequest<any[]>(`/manual-customers?business_id=${id}&q=${encodeURIComponent(q)}&filter=${filter}`)},
  async getManualCustomer(customerId:string){const id=await currentBusiness();return apiRequest<any>(`/manual-customers/${customerId}?business_id=${id}`)},
  async createManualCustomer(data:any){const id=await currentBusiness();const clean=Object.fromEntries(Object.entries(data).filter(([,value])=>value!==''&&value!==undefined));return apiRequest<any>('/manual-customers',{method:'POST',body:JSON.stringify({...clean,business_id:id})})},
  async updateManualCustomer(customerId:string,data:any){const id=await currentBusiness();const clean=Object.fromEntries(Object.entries(data).filter(([,value])=>value!==''&&value!==undefined));return apiRequest<any>(`/manual-customers/${customerId}?business_id=${id}`,{method:'PATCH',body:JSON.stringify(clean)})},
  async addManualMovement(customerId:string,type:'STAMP'|'PURCHASE'|'POINTS',value=1){const id=await currentBusiness();return apiRequest(`/manual-customers/${customerId}/movements`,{method:'POST',body:JSON.stringify({business_id:id,type,value})})},
  async redeemManualBenefit(customerId:string){const id=await currentBusiness();return apiRequest(`/manual-customers/${customerId}/redeem`,{method:'POST',body:JSON.stringify({business_id:id})})},
  async scanCustomer(qrPayload: string) {
    const id = await currentBusiness();
    return mapSnapshot(
      await apiRequest("/cashier/scan-customer", {
        method: "POST",
        body: JSON.stringify({ qr_token: qrPayload, business_id: id }),
      }),
    );
  },
  async searchCustomerByPhone(phone: string) {
    const id = await currentBusiness();
    const rows = await apiRequest<any[]>(
      `/cashier/customers/search?phone=${encodeURIComponent(phone)}&business_id=${id}`,
    );
    return rows.length ? mapSnapshot(rows[0]) : null;
  },
  async registerTransaction(customerId: string): Promise<TransactionResult> {
    const id = await currentBusiness();
    const result = await apiRequest<any>("/cashier/transactions", {
      method: "POST",
      body: JSON.stringify({ business_id: id, customer_user_id: customerId }),
    });
    const previous = cache.get(customerId);
    if (!previous) throw new Error("Vuelve a buscar al cliente");
    const customer = await refresh(previous);
    const unlockedReward = result.reward_unlocked
      ? {
          id: result.reward_id,
          title: result.reward_description,
          business: customer.business,
          status: "available" as const,
        }
      : undefined;
    return { customer, unlockedReward };
  },
  async redeemReward(
    customerId: string,
    rewardId: string,
  ): Promise<CashierReward> {
    const id = await currentBusiness();
    const customer = cache.get(customerId);
    await apiRequest("/cashier/rewards/redeem", {
      method: "POST",
      body: JSON.stringify({ reward_id: rewardId, business_id: id }),
    });
    return {
      id: rewardId,
      title:
        customer?.rewards.find((r) => r.id === rewardId)?.title ?? "Recompensa",
      business: customer?.business ?? "",
      status: "used",
    };
  },
  async cancelLastTransaction(customerId: string) {
    const customer = cache.get(customerId);
    if (!customer?.lastTransaction)
      throw new Error("No existe una transacción para anular");
    await apiRequest(
      `/cashier/transactions/${customer.lastTransaction.id}/cancel`,
      { method: "POST" },
    );
    cache.delete(customerId);
  },
  resetBusiness() {
    businessId = null;
    businessName = null;
    cache.clear();
  },
};
