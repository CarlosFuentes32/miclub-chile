import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UsersService } from './users.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtUser } from '../auth/auth.types';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { IsString, MinLength } from 'class-validator';

class ChangeOwnPasswordDto { @IsString() @MinLength(8) password!:string; }

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Patch('me') updateMe(@CurrentUser() user: JwtUser, @Body() dto: UpdateProfileDto) { return this.users.updateProfile(user.id, dto); }
  @Patch('me/password') changePassword(@CurrentUser() user:JwtUser,@Body() dto:ChangeOwnPasswordDto){return this.users.changeOwnPassword(user.id,dto.password)}
  @Get() @Roles(UserRole.MICLUB_ADMIN) list() { return this.users.list(); }
}
