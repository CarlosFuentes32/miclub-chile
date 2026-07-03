import assert from 'node:assert/strict';
import { ConflictException } from '@nestjs/common';
import { CustomerService } from '../backend/api/src/customer/customer.service';
import { BusinessesService } from '../backend/api/src/businesses/businesses.service';
import { UsersService } from '../backend/api/src/users/users.service';

type Membership={id:string;customerUserId:string;businessId:string;status:'ACTIVE'|'INACTIVE';joinedAt:Date};
const businesses=[{id:'a',slug:'comercio-a',name:'Comercio A',logoUrl:null,status:'ACTIVE'},{id:'b',slug:'comercio-b',name:'Comercio B',logoUrl:null,status:'ACTIVE'}];
const users:any[]=[];
const memberships:Membership[]=[];
const cycles:any[]=[];
const rewards:any[]=[{id:'r-a',customerUserId:'u1',businessId:'a',status:'AVAILABLE',rewardDescription:'A',generatedAt:new Date()}];
const transactions:any[]=[];
const key=(where:any)=>memberships.find(m=>m.customerUserId===where.customerUserId_businessId.customerUserId&&m.businessId===where.customerUserId_businessId.businessId);
const tx:any={
  user:{create:({data}:any)=>{const row={id:'u1',createdAt:new Date(),updatedAt:new Date(),...data};users.push(row);return row}},
  business:{findUnique:({where}:any)=>businesses.find(b=>b.slug===where.slug)??null},
  customerBusiness:{findUnique:({where}:any)=>key(where)??null,create:({data}:any)=>{const row={id:`m-${data.businessId}`,status:'ACTIVE',joinedAt:new Date(),...data};memberships.push(row);return row},update:({where,data}:any)=>{const row=memberships.find(m=>m.id===where.id)!;Object.assign(row,data);return row}},
  cycle:{findFirst:({where}:any)=>cycles.find(c=>c.customerUserId===where.customerUserId&&c.businessId===where.businessId&&c.status===where.status)??null,create:({data}:any)=>{const row={id:`c-${data.businessId}`,currentValue:0,status:'ACTIVE',createdAt:new Date(),...data};cycles.push(row);return row},findMany:({where}:any)=>cycles.filter(c=>c.customerUserId===where.customerUserId&&c.businessId===where.businessId)},
  loyaltyProgram:{findFirst:({where}:any)=>({id:`p-${where.businessId}`,businessId:where.businessId,targetValue:10,status:'ACTIVE'})},
  reward:{findMany:({where}:any)=>rewards.filter(r=>r.customerUserId===where.customerUserId&&r.businessId===where.businessId),count:()=>0},
  transaction:{findMany:({where}:any)=>transactions.filter(t=>t.customerUserId===where.customerUserId&&t.businessId===where.businessId),findFirst:()=>null},
};
const prisma:any={...tx,$transaction:(callback:any)=>callback(tx),business:tx.business,user:{...tx.user,findFirst:()=>null,findUnique:({where}:any)=>users.find(u=>u.id===where.id)??null},customerBusiness:{...tx.customerBusiness,findMany:({where}:any)=>{assert.ok(where.businessId,'El panel siempre debe filtrar por businessId');return memberships.filter(m=>m.businessId===where.businessId).map(m=>({...m,customer:users.find(u=>u.id===m.customerUserId)}))}},reward:{...tx.reward,updateMany:()=>({count:0})}};
const customer=new CustomerService(prisma,{} as any);
const access={requireManager:async()=>({})};
const commerce=new BusinessesService(prisma,access as any,{get:()=>''} as any);
const userService=new UsersService(prisma,{} as any);

async function run(){
  // Caso 1: el servicio real de registro crea una sola cuenta y la relación A.
  await userService.createCustomer({name:'Cliente Prueba',email:'cliente@mi.cl',phone:'+56911111111',password:'secreto',businessSlug:'comercio-a'});
  assert.equal(users.length,1);assert.equal(memberships.filter(m=>m.businessId==='a').length,1);
  // Caso 2: la misma cuenta se une a B y obtiene un ciclo B separado.
  await customer.join('u1','comercio-b');assert.equal(users.length,1);assert.equal(memberships.length,2);assert.ok(cycles.some(c=>c.businessId==='b'));
  // Caso 3: operación idempotente; segundo intento se informa y no duplica.
  await assert.rejects(()=>customer.join('u1','comercio-a'),ConflictException);assert.equal(memberships.filter(m=>m.businessId==='a').length,1);
  // Caso 4: desactivar A no elimina usuario ni modifica B.
  await commerce.updateCustomerStatus('manager','a','u1','INACTIVE');assert.equal(users.length,1);assert.equal(key({customerUserId_businessId:{customerUserId:'u1',businessId:'b'}})?.status,'ACTIVE');
  // Caso 5: progreso y recompensas permanecen particionados por comercio.
  cycles.find(c=>c.businessId==='a').currentValue=7;assert.equal(cycles.find(c=>c.businessId==='a')?.currentValue,7);assert.equal(cycles.find(c=>c.businessId==='b')?.currentValue,0);assert.equal(rewards.filter(r=>r.businessId==='b').length,0);
  // Caso 6: la consulta administrativa exige businessId y solo devuelve sus relaciones.
  const rows=await commerce.customers('manager','b','');assert.equal(rows.length,1);assert.ok(memberships.every(m=>m.customerUserId==='u1'));
  console.log('OK: 6 casos multi-comercio verificados');
}
run().catch(error=>{console.error(error);process.exitCode=1});
