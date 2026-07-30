import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@brgy/shared';
import { IS_PUBLIC_KEY, ROLES_KEY, RequestUser } from './decorators';

/** Global JWT guard; routes marked @Public() are skipped. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}

/** Global role guard; only enforces routes decorated with @Roles(). */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const user = context.switchToHttp().getRequest().user as RequestUser | undefined;
    // Resident-only routes also admit staff with a linked resident profile (dual role).
    const allowed =
      user &&
      (required.includes(user.role) || (required.includes(Role.RESIDENT) && user.isResident));
    if (!allowed) {
      throw new ForbiddenException('You do not have access to this resource.');
    }
    return true;
  }
}
