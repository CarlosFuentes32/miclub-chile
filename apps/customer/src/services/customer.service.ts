import { apiRequest, AuthUser, getApiUrl } from "@miclub/shared";
import {
  CustomerDashboard,
  CustomerProfile,
  CustomerRegistration,
} from "../types/customer";
const API_URL = getApiUrl();
function profileFromUser(user: AuthUser): CustomerProfile {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email || undefined,
    birthDate: user.birthDate?.slice(0, 10),
    rut: user.rut,
    shortCode: `MC-${user.id.slice(-6).toUpperCase()}`,
  };
}
export const customerService = {
  async getBusiness(slug:string){const response=await fetch(`${API_URL}/public/businesses/${encodeURIComponent(slug)}`);if(!response.ok){const error=await response.json().catch(()=>({}));throw new Error(error.message??'Comercio no encontrado')}return response.json()},
  getMembership:(slug:string)=>apiRequest<any>(`/customer/businesses/${encodeURIComponent(slug)}/membership`),
  joinBusiness:(slug:string)=>apiRequest<any>(`/customer/businesses/${encodeURIComponent(slug)}/join`,{method:'POST'}),
  async getDashboard(): Promise<CustomerDashboard> {
    const [home, rewards, history] = await Promise.all([
      apiRequest<any>("/customer/home"),
      apiRequest<any[]>("/customer/rewards"),
      apiRequest<any[]>("/customer/history"),
    ]);
    const units:Record<string,string>={PURCHASE_COUNT:'compras',VISIT_COUNT:'sellos',POINTS:'puntos',AMOUNT_SPENT:'acumulado'};
    const programs=(home.programs??(home.primary_progress?[home.primary_progress]:[])).map((program:any)=>({
      businessId:program.business.id,
      business:program.business.name,
      current:Number(program.current_value),
      goal:Number(program.target_value),
      reward:program.next_reward,
      unit:units[program.accumulation_type]??'avances',
      active:program.status!=='NO_PROGRAM',
    }));
    return {
      programs,
      rewards: rewards.map((r) => ({
        id: r.id,
        title: r.rewardDescription,
        business: r.business.name,
        status:
          r.status === "AVAILABLE"
            ? "available"
            : r.status === "REDEEMED"
              ? "used"
              : "expired",
        expiresAt: r.expiresAt
          ? new Date(r.expiresAt).toLocaleDateString("es-CL")
          : undefined,
        usedAt: r.redeemedAt
          ? new Date(r.redeemedAt).toLocaleDateString("es-CL")
          : undefined,
      })),
      history: history.map((h) => ({
        id: h.id,
        business: h.business.name,
        date: new Date(h.created_at).toLocaleString("es-CL"),
        action:
          h.status === "CANCELLED"
            ? "Transacción anulada"
            : "Compra registrada",
        progress: `+${h.value_added}`,
      })),
      qrToken: home.qr.token,
      shortCode: home.qr.short_code,
    };
  },
  getProfile(user: AuthUser): CustomerProfile {
    return profileFromUser(user);
  },
  async updateProfile(profile: CustomerProfile): Promise<CustomerProfile> {
    const updated = await apiRequest<any>("/users/me", {
      method: "PATCH",
      body: JSON.stringify({
        name: profile.name,
        phone: profile.phone,
        email: profile.email,
        birthDate: profile.birthDate,
      }),
    });
    return {
      ...profile,
      ...updated,
      birthDate: updated.birthDate?.slice(0, 10),
    };
  },
  async register(data: CustomerRegistration): Promise<void> {
    const payload = Object.fromEntries(
      Object.entries(data).filter(
        ([, value]) => value !== "" && value !== undefined,
      ),
    );
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        Array.isArray(error.message)
          ? error.message.join(", ")
          : (error.message ?? "No pudimos crear tu cuenta"),
      );
    }
  },
  requestPasswordReset:(identifier:string)=>apiRequest<{message:string}>("/auth/password-reset/request",{method:"POST",body:JSON.stringify({identifier})}),
  confirmPasswordReset:(token:string,password:string)=>apiRequest<{message:string}>("/auth/password-reset/confirm",{method:"POST",body:JSON.stringify({token,password})}),
};
