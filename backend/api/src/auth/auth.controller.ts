import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { RegisterUserDto } from '../users/dto/register-user.dto';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtUser } from './auth.types';

const REFRESH_COOKIE = 'miclub_refresh';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly users: UsersService, private readonly config: ConfigService) {}

  @Post('register')
  async register(@Body() dto: RegisterUserDto, @Res({ passthrough: true }) response: Response) {
    return this.respondWithSession(await this.auth.register(dto), response);
  }

  @Post('login') @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    return this.respondWithSession(await this.auth.login(dto), response);
  }

  @Post('refresh') @HttpCode(200)
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return this.respondWithSession(await this.auth.refresh(request.cookies?.[REFRESH_COOKIE]), response);
  }

  @Post('logout') @HttpCode(204)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(request.cookies?.[REFRESH_COOKIE]);
    response.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }

  @Get('me') @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtUser) { return this.users.findPublicById(user.id); }

  private respondWithSession(session: Awaited<ReturnType<AuthService['login']>>, response: Response) {
    const { refreshToken, refreshExpiresAt, ...body } = session;
    response.cookie(REFRESH_COOKIE, refreshToken, { ...this.cookieOptions(), expires: refreshExpiresAt });
    return body;
  }

  private cookieOptions() {
    const production = this.config.get('NODE_ENV') === 'production';
    return { httpOnly: true, secure: production, sameSite: production ? 'none' as const : 'lax' as const, path: '/api/auth' };
  }
}
