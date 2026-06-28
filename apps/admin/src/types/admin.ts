export type BusinessStatus='active'|'suspended'|'grace_period'|'cancelled';export type UsageLevel='frequent'|'low'|'inactive';export type UserStatus='active'|'suspended';export type UserRole='CUSTOMER'|'CASHIER'|'BUSINESS_ADMIN'|'BUSINESS_OWNER'|'MICLUB_ADMIN';
export interface AdminDashboard{activeBusinesses:number;registeredUsers:number;todayTransactions:number;rewardsGenerated:number;rewardsRedeemed:number;atRiskBusinesses:number;estimatedMonthlyRevenue:number}
export interface AdminBusiness{id:string;name:string;category:string;rut?:string;owner:string;phone:string;email:string;plan:string;status:BusinessStatus;customers:number;transactions:number;rewards:number;lastUse:string;usage:UsageLevel;activeProgram:string}
export interface AdminUser{id:string;name:string;phone:string;email:string;role:UserRole;status:UserStatus;createdAt:string;business?:string;lastAccess:string}
export interface Plan{id:string;name:string;monthlyPrice:number;customerLimit:number;collaboratorLimit:number;features:string[];active:boolean}
export interface Reports{newBusinesses:number;newUsers:number;monthlyTransactions:number;rewardsGenerated:number;rewardsRedeemed:number;activeBusinesses:number;suspendedBusinesses:number}
export type TicketStatus='open'|'in_progress'|'resolved'|'closed';export interface SupportTicket{id:string;business:string;user:string;subject:string;status:TicketStatus;priority:'low'|'medium'|'high';createdAt:string}
export interface GlobalSettings{categories:string[];programTypes:string[];statuses:string[];globalTexts:{welcome:string;support:string}}
