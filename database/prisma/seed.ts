import { AccumulationType,CycleStatus,MembershipStatus,PrismaClient,ProgramStatus,UserRole,UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma=new PrismaClient();
const value=(key:string,fallback:string)=>process.env[key]??fallback;
const slugify=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

async function main(){
 const password=value('SEED_PASSWORD','MiClubDemo2026!');const passwordHash=await bcrypt.hash(password,12);
 const businessName=value('PILOT_BUSINESS_NAME','Minimarket Piloto');const businessSlug=value('PILOT_BUSINESS_SLUG',slugify(businessName));
 const adminEmail=value('SEED_ADMIN_EMAIL','admin@miclub.local');const ownerEmail=value('PILOT_OWNER_EMAIL','owner@miclub.local');const cashierEmail=value('PILOT_CASHIER_EMAIL','cashier@miclub.local');const customerEmail=value('PILOT_CUSTOMER_EMAIL','customer@miclub.local');
 const users=[
  {name:'Admin MiClub',email:adminEmail,phone:value('PILOT_ADMIN_PHONE','+56911111111'),role:UserRole.MICLUB_ADMIN},
  {name:value('PILOT_OWNER_NAME','Dueño Minimarket Piloto'),email:ownerEmail,phone:value('PILOT_OWNER_PHONE','+56922222222'),role:UserRole.BUSINESS_OWNER},
  {name:value('PILOT_CASHIER_NAME','Cajero Piloto'),email:cashierEmail,phone:value('PILOT_CASHIER_PHONE','+56933333333'),role:UserRole.CASHIER},
  {name:value('PILOT_CUSTOMER_NAME','Cliente Demo'),email:customerEmail,phone:value('PILOT_CUSTOMER_PHONE','+56995026368'),role:UserRole.CUSTOMER},
 ];
 for(const user of users)await prisma.user.upsert({where:{email:user.email},update:{...user,passwordHash,status:UserStatus.ACTIVE},create:{...user,passwordHash,status:UserStatus.ACTIVE}});
 const[owner,cashier,customer]=await Promise.all([prisma.user.findUniqueOrThrow({where:{email:ownerEmail}}),prisma.user.findUniqueOrThrow({where:{email:cashierEmail}}),prisma.user.findUniqueOrThrow({where:{email:customerEmail}})]);
 const plans=[
  {name:'MiClub Start',monthlyPrice:19990,customerLimit:500,collaboratorLimit:3,features:['Programa de fidelización','Panel cajero','QR de inscripción']},
  {name:'MiClub Business',monthlyPrice:39990,customerLimit:2500,collaboratorLimit:10,features:['Todo Start','Reportes básicos','Más colaboradores']},
  {name:'MiClub Enterprise',monthlyPrice:0,customerLimit:100000,collaboratorLimit:100,features:['Configuración personalizada','Soporte prioritario','Múltiples sucursales']},
 ];
 for(const plan of plans)await prisma.plan.upsert({where:{name:plan.name},update:{...plan,active:true},create:{...plan,active:true}});
 const startPlan=await prisma.plan.findUniqueOrThrow({where:{name:'MiClub Start'}});
 const business=await prisma.business.upsert({where:{slug:businessSlug},update:{name:businessName,businessType:'minimarket',ownerUserId:owner.id,planId:startPlan.id,status:'ACTIVE'},create:{name:businessName,slug:businessSlug,businessType:'minimarket',rutBusiness:process.env.PILOT_BUSINESS_RUT||null,ownerUserId:owner.id,phone:value('PILOT_BUSINESS_PHONE','+56944444444'),email:value('PILOT_BUSINESS_EMAIL','contacto@minimarket-piloto.local'),address:value('PILOT_BUSINESS_ADDRESS','Dirección piloto por configurar'),planId:startPlan.id,status:'ACTIVE'}});
 for(const member of[{userId:owner.id,role:UserRole.BUSINESS_OWNER},{userId:cashier.id,role:UserRole.CASHIER}])await prisma.businessUser.upsert({where:{businessId_userId:{businessId:business.id,userId:member.userId}},update:{role:member.role,status:MembershipStatus.ACTIVE},create:{businessId:business.id,...member,status:MembershipStatus.ACTIVE}});
 await prisma.customerBusiness.upsert({where:{customerUserId_businessId:{customerUserId:customer.id,businessId:business.id}},update:{status:MembershipStatus.ACTIVE},create:{customerUserId:customer.id,businessId:business.id,status:MembershipStatus.ACTIVE}});
 const target=Number(value('PILOT_PROGRAM_TARGET','10'));const reward=value('PILOT_PROGRAM_REWARD','$5.000 de descuento en la próxima compra');
 let program=await prisma.loyaltyProgram.findFirst({where:{businessId:business.id,status:ProgramStatus.ACTIVE},orderBy:{version:'desc'}});
 if(!program)program=await prisma.loyaltyProgram.upsert({where:{businessId_version:{businessId:business.id,version:1}},update:{name:`${target} compras`,accumulationType:AccumulationType.PURCHASE_COUNT,targetValue:target,rewardDescription:reward,rewardExpirationDays:30,status:ProgramStatus.ACTIVE},create:{businessId:business.id,name:`${target} compras`,accumulationType:AccumulationType.PURCHASE_COUNT,targetValue:target,rewardDescription:reward,rewardExpirationDays:30,version:1,status:ProgramStatus.ACTIVE}});
 const activeCycle=await prisma.cycle.findFirst({where:{businessId:business.id,customerUserId:customer.id,status:CycleStatus.ACTIVE}});if(!activeCycle)await prisma.cycle.create({data:{businessId:business.id,customerUserId:customer.id,loyaltyProgramId:program.id,targetValue:program.targetValue}});
 console.log(`Piloto listo: ${business.name}, dueño ${ownerEmail}, cajero ${cashierEmail}, cliente ${customerEmail}.`);
}
main().finally(()=>prisma.$disconnect());
