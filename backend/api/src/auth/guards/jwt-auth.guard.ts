import { ExecutionContext,ForbiddenException,Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context:ExecutionContext){const active=await super.canActivate(context);const request=context.switchToHttp().getRequest();if(request.user?.forcePasswordChange&&!request.path.endsWith('/users/me/password')&&!request.path.endsWith('/auth/me'))throw new ForbiddenException('Debes crear una nueva contraseña antes de continuar.');return active as boolean;}
}
