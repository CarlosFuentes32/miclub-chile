export interface CashierReward { id: string; title: string; business: string; status: 'available' | 'used'; }
export interface CashierCustomer { id: string; name: string; phone: string; business: string; current: number; goal: number; nextReward: string; rewards: CashierReward[]; lastTransaction?: { id: string; createdAt: string; cancellableUntil: string; status: 'completed' | 'cancelled' }; }
export interface TransactionResult { customer: CashierCustomer; unlockedReward?: CashierReward; }
export interface ActionResult { title: string; description: string; detail?: string; kind: 'success' | 'warning'; }
export type CashierFlow = 'transaction' | 'redeem';
