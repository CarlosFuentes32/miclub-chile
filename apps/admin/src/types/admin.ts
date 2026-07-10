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
  customerLimit: number;
  collaboratorLimit: number;
  features: string[];
  active: boolean;
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
  metadata?: Record<string, unknown>;
  createdAt: string;
  user?: { name: string; email: string; role: UserRole };
  business?: { name: string };
}
