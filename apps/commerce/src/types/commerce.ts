export type ProgramType='stamps'|'points'|'cashback'|'visits'|'amount';export type RewardStatus='available'|'redeemed'|'expired'|'cancelled';
export interface DashboardSummary{registeredCustomers:number;transactions:number;rewardsGenerated:number;rewardsRedeemed:number;newCustomersToday:number;activeCustomers:number;activeProgram?:string}
export interface BusinessSettings{id:string;name:string;category:string;rut?:string;address:string;phone:string;email:string;logoUrl?:string;schedule:string;status:'active'|'inactive'}
export interface LoyaltyProgram{id:string;version:number;type:ProgramType;earningRule:string;goal:number;goalLabel:string;reward:string;validity:'none'|'30'|'60'|'90'|'custom';customExpiry?:string;status:'draft'|'active'|'archived'}
export type LoyaltyProgramDraft=Omit<LoyaltyProgram,'id'|'version'|'status'>;
export interface BusinessCustomer{id:string;name:string;phone:string;progress:string;rewardsAvailable:number;lastVisit:string;history:string[]}
export interface Collaborator{id:string;name:string;email:string;role:'BUSINESS_ADMIN'|'CASHIER';status:'active'|'inactive'}
export interface CreatedCollaborator extends Collaborator{temporaryPassword:string}
export interface BusinessReward{id:string;customer:string;description:string;generatedAt:string;expiresAt:string;status:RewardStatus}
export interface QRMaterial{businessCode:string;registrationUrl:string;businessName:string}
