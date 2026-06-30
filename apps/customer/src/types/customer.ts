export type RewardStatus = 'available' | 'used' | 'expired';

export interface LoyaltyProgress { business: string; current: number; goal: number; reward: string; }
export interface Reward { id: string; title: string; business: string; status: RewardStatus; expiresAt?: string; usedAt?: string; }
export interface HistoryEntry { id: string; business: string; date: string; action: string; progress: string; }
export interface CustomerProfile { id: string; name: string; phone: string; email?: string; birthDate?: string; rut?: string; shortCode: string; }
export interface CustomerDashboard { progress: LoyaltyProgress; rewards: Reward[]; history: HistoryEntry[]; qrToken: string; shortCode: string; }
export interface CustomerRegistration { name: string; phone: string; email: string; birthDate?: string; rut?: string; password: string; businessSlug?: string; }
