import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

export const publicUserSelect = { id:true,name:true,email:true,phone:true,birthDate:true,rut:true,role:true,status:true,createdAt:true,updatedAt:true } as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createCustomer(dto: RegisterUserDto) {
    const digits = dto.phone.replace(/\D/g, '');
    const phone = digits.length === 8 ? `+569${digits}` : dto.phone;
    const email = dto.email?.trim().toLowerCase() || `${digits}@phone.miclub.local`;
    const existing = await this.prisma.user.findFirst({where:{OR:[{email},{phone},...(dto.rut?[{rut:dto.rut}]:[])]}});
    if(existing)throw new ConflictException('El correo, teléfono o RUT ya está registrado');
    const passwordHash=await bcrypt.hash(dto.password,12);
    return this.prisma.$transaction(async tx=>{
      const user=await tx.user.create({data:{name:dto.name.trim(),email,phone,passwordHash,birthDate:dto.birthDate?new Date(dto.birthDate):undefined,rut:dto.rut,role:UserRole.CUSTOMER,status:UserStatus.ACTIVE},select:publicUserSelect});
      if(dto.businessSlug){
        const business=await tx.business.findUnique({where:{slug:dto.businessSlug}});
        if(business)await tx.customerBusiness.create({data:{customerUserId:user.id,businessId:business.id}});
      }
      return user;
    });
  }

  async findPublicById(id:string){const user=await this.prisma.user.findUnique({where:{id},select:publicUserSelect});if(!user)throw new NotFoundException('Usuario no encontrado');return user}
  list(){return this.prisma.user.findMany({select:publicUserSelect,orderBy:{createdAt:'desc'}})}
  updateProfile(id:string,dto:UpdateProfileDto){return this.prisma.user.update({where:{id},data:{name:dto.name?.trim(),phone:dto.phone,email:dto.email?.trim().toLowerCase(),birthDate:dto.birthDate?new Date(dto.birthDate):undefined,rut:dto.rut},select:publicUserSelect})}
}
