import { Role } from '@brgy/shared';
import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
/** Skip JWT auth for this route. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
/** Restrict a route to the given roles (requires authentication). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/** JWT payload attached to the request by JwtStrategy. */
export interface RequestUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  /** RESIDENT accounts, plus staff linked to a census record (dual role). */
  isResident: boolean;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as RequestUser;
  },
);
