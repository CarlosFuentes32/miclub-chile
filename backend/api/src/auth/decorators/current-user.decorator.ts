import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtUser } from '../auth.types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): JwtUser => context.switchToHttp().getRequest().user,
);
