import { CashierCustomer } from '../types/cashier';

export const mockCustomers: CashierCustomer[] = [
  { id:'customer-demo-1', name:'Camila Rojas', phone:'+56995026368', business:'Café Central', current:7, goal:10, nextReward:'1 café a elección', rewards:[{id:'reward-1',title:'Café americano gratis',business:'Café Central',status:'available'}], lastTransaction:{id:'tx-previous',createdAt:new Date().toISOString(),cancellableUntil:new Date(Date.now()+10*60_000).toISOString(),status:'completed'} },
  { id:'customer-demo-2', name:'Diego Soto', phone:'+56995026369', business:'Café Central', current:9, goal:10, nextReward:'1 café a elección', rewards:[] },
];

export const mockAuditEvents: Array<{action:string;transactionId:string;occurredAt:string}> = [];
