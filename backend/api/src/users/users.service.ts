import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AuditService } from '../audit/audit.service';

export const publicUserSelect = { id:true,name:true,email:true,phone:true,birthDate:true,rut:true,role:true,status:true,forcePasswordChange:true,lockedAt:true,createdAt:true,updatedAt:true } as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async createCustomer(dto: RegisterUserDto) {
    const digits = dto.phone.replace(/\D/g, '');
    const phone = digits.length === 8 ? `+569${digits}` : dto.phone;
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({where:{OR:[{email},{phone},...(dto.rut?[{rut:dto.rut}]:[])]}});
    if(existing)throw new ConflictException('El correo, teléfono o RUT ya está registrado');
    const passwordHash=await bcrypt.hash(dto.password,12);
    return this.prisma.$transaction(async tx=>{
      const user=await tx.user.create({data:{name:dto.name.trim(),email,phone,passwordHash,birthDate:dto.birthDate?new Date(dto.birthDate):undefined,rut:dto.rut,role:UserRole.CUSTOMER,status:UserStatus.ACTIVE},select:publicUserSelect});
      if(dto.businessSlug){
        const business=await tx.business.findUnique({where:{slug:dto.businessSlug}});
        if(business){
          await tx.customerBusiness.create({data:{customerUserId:user.id,businessId:business.id}});
          const program=await tx.loyaltyProgram.findFirst({where:{businessId:business.id,status:'ACTIVE'},orderBy:{version:'desc'}});
          if(program)await tx.cycle.create({data:{customerUserId:user.id,businessId:business.id,loyaltyProgramId:program.id,targetValue:program.targetValue}});
        }
      }
      return user;
    });
  }

  async findPublicById(id:string){const user=await this.prisma.user.findUnique({where:{id},select:publicUserSelect});if(!user)throw new NotFoundException('Usuario no encontrado');return user}
  list(){return this.prisma.user.findMany({select:publicUserSelect,orderBy:{createdAt:'desc'}})}
  async updateProfile(id:string,dto:UpdateProfileDto){
    if(dto.rut!==undefined)throw new BadRequestException('El RUT no puede modificarse. Si existe un error, comuníquese con Soporte MiClub Chile.');
    const current=await this.prisma.user.findUniqueOrThrow({where:{id}});
    const data={name:dto.name?.trim(),phone:dto.phone,email:dto.email?.trim().toLowerCase(),birthDate:dto.birthDate?new Date(dto.birthDate):undefined};
    return this.prisma.$transaction(async tx=>{
      const updated=await tx.user.update({where:{id},data,select:publicUserSelect});
      for(const field of ['name','phone','email','birthDate'] as const){
        if(data[field]!==undefined&&String(current[field]??'')!==String(data[field]??'')){
          await tx.userChange.create({data:{userId:id,actorId:id,field,oldValue:String(current[field]??''),newValue:String(data[field]??''),action:'profile_updated'}});
          await this.audit.create({userId:id,action:`${field}_changed`,entityType:'user',entityId:id,metadata:{field}},tx);
        }
      }
      return updated;
    });
  }

  async changeOwnPassword(id:string,password:string){
    await this.prisma.$transaction(async tx=>{
      await tx.user.update({where:{id},data:{passwordHash:await bcrypt.hash(password,12),forcePasswordChange:false,failedLoginAttempts:0,lockedAt:null}});
      await tx.authSession.updateMany({where:{userId:id,revokedAt:null},data:{revokedAt:new Date()}});
      await tx.userChange.create({data:{userId:id,actorId:id,field:'password',action:'password_changed'}});
      await this.audit.create({userId:id,action:'password_changed',entityType:'user',entityId:id},tx);
    });
    return {ok:true};
  }
}
