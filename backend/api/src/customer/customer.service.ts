import { ConflictException,Injectable,NotFoundException } from '@nestjs/common';
import { CycleStatus,MembershipStatus,ProgramStatus,RewardStatus } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class CustomerService{
 constructor(private readonly prisma:PrismaService,private readonly jwt:JwtService){}
 async home(userId:string){
  await this.expire(userId);
  const[customer,memberships,cycles,rewards,history]=await Promise.all([
   this.prisma.user.findUniqueOrThrow({where:{id:userId},select:{id:true,name:true,phone:true}}),
   this.prisma.customerBusiness.findMany({where:{customerUserId:userId,status:MembershipStatus.ACTIVE,business:{status:'ACTIVE'}},orderBy:{joinedAt:'asc'},include:{business:{select:{id:true,name:true}}}}),
   this.prisma.cycle.findMany({where:{customerUserId:userId,status:CycleStatus.ACTIVE},orderBy:{updatedAt:'desc'},include:{loyaltyProgram:true}}),
   this.prisma.reward.findMany({where:{customerUserId:userId,status:RewardStatus.AVAILABLE},orderBy:{generatedAt:'desc'},take:5,include:{business:true}}),
   this.history(userId,5),
  ]);
  const cyclesByBusiness=new Map(cycles.map(c=>[c.businessId,c]));
  const programs=await Promise.all(memberships.map(async membership=>{const cycle=cyclesByBusiness.get(membership.businessId);const program=cycle?.loyaltyProgram??await this.prisma.loyaltyProgram.findFirst({where:{businessId:membership.businessId,status:ProgramStatus.ACTIVE},orderBy:{version:'desc'}});return{business:membership.business,cycle_id:cycle?.id??null,current_value:cycle?Number(cycle.currentValue):0,target_value:program?Number(program.targetValue):0,next_reward:program?.rewardDescription??'Este comercio todavía no tiene un programa activo.',accumulation_type:program?.accumulationType??null,status:program?'ACTIVE':'NO_PROGRAM'}}));
  const primary=programs.find(program=>program.cycle_id)??programs[0]??null;
  const qrToken=await this.jwt.signAsync({sub:userId,type:'customer_qr'},{expiresIn:'5m'});
  return{qr:{token:qrToken,short_code:`MC-${userId.slice(-6).toUpperCase()}`,expires_in_seconds:300},customer,programs,primary_progress:primary,rewards_available:rewards.map(r=>({id:r.id,business:r.business.name,description:r.rewardDescription,expires_at:r.expiresAt})),recent_history:history};
 }
 async rewards(userId:string){await this.expire(userId);return this.prisma.reward.findMany({where:{customerUserId:userId},orderBy:{generatedAt:'desc'},include:{business:{select:{id:true,name:true}}}})}
 async history(userId:string,take=50){const rows=await this.prisma.transaction.findMany({where:{customerUserId:userId},orderBy:{createdAt:'desc'},take,include:{business:{select:{id:true,name:true}}}});return rows.map(t=>({id:t.id,business:t.business,type:t.transactionType,value_added:Number(t.valueAdded),amount:t.amountOptional?Number(t.amountOptional):null,status:t.status,created_at:t.createdAt,cancelled_at:t.cancelledAt}))}
 async businessBySlug(slug:string){const business=await this.prisma.business.findUnique({where:{slug},select:{id:true,name:true,slug:true,logoUrl:true,status:true}});if(!business||business.status!=='ACTIVE')throw new NotFoundException('Comercio no encontrado o no disponible');return business}
 async membership(userId:string,slug:string){const business=await this.businessBySlug(slug);const membership=await this.prisma.customerBusiness.findUnique({where:{customerUserId_businessId:{customerUserId:userId,businessId:business.id}}});return{business,membership_status:membership?.status??null,already_joined:membership?.status===MembershipStatus.ACTIVE}}
 async join(userId:string,slug:string){const business=await this.businessBySlug(slug);return this.prisma.$transaction(async tx=>{const existing=await tx.customerBusiness.findUnique({where:{customerUserId_businessId:{customerUserId:userId,businessId:business.id}}});if(existing?.status===MembershipStatus.ACTIVE)throw new ConflictException('Ya estás inscrito en este comercio.');const membership=existing?await tx.customerBusiness.update({where:{id:existing.id},data:{status:MembershipStatus.ACTIVE,joinedAt:new Date()}}):await tx.customerBusiness.create({data:{customerUserId:userId,businessId:business.id}});const activeCycle=await tx.cycle.findFirst({where:{customerUserId:userId,businessId:business.id,status:CycleStatus.ACTIVE}});if(!activeCycle){const program=await tx.loyaltyProgram.findFirst({where:{businessId:business.id,status:ProgramStatus.ACTIVE},orderBy:{version:'desc'}});if(program)await tx.cycle.create({data:{customerUserId:userId,businessId:business.id,loyaltyProgramId:program.id,targetValue:program.targetValue}})}return{joined:true,business,membership_id:membership.id}})}
 private expire(userId:string){return this.prisma.reward.updateMany({where:{customerUserId:userId,status:RewardStatus.AVAILABLE,expiresAt:{lte:new Date()}},data:{status:RewardStatus.EXPIRED}})}
}
