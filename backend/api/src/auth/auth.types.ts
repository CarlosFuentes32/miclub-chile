import { UserRole } from '@prisma/client';

export interface JwtUser {
  id: string;
  email: string;
  role: UserRole;
  forcePasswordChange?: boolean;
  businessId?: string;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  businessId?: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  sid: string;
  fid?: string;
  type: 'refresh';
}
