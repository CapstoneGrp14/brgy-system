import { Role, type StaffModule, staffCanAccess } from '@brgy/shared';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../modules/users/user.entity';
import type { RequestUser } from './decorators';

export const MODULE_KEY = 'requiredStaffModule';

/**
 * Mark a route as belonging to a staff module.
 *
 * Filtering the sidebar is presentation, not access control — a withheld module
 * whose routes still answer is withheld in appearance only. This decorator is
 * what actually denies it, so every staff-facing controller the admin screen
 * can switch off carries one.
 */
export const RequiresModule = (moduleKey: StaffModule) => SetMetadata(MODULE_KEY, moduleKey);

@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const moduleKey = this.reflector.getAllAndOverride<StaffModule | undefined>(MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!moduleKey) return true;

    const user = context.switchToHttp().getRequest<{ user?: RequestUser }>().user;
    if (!user) return true; // unauthenticated is the JWT guard's decision, not ours

    // Residents never carry staff modules — their own role guard already
    // governs these routes. Admins keep full oversight by design.
    if (user.role !== Role.EMPLOYEE) return true;

    // Read the current grant rather than a token claim: an administrator
    // withdrawing access expects it to apply now, not when the access token
    // next refreshes.
    const row = await this.users.findOne({
      where: { id: user.id },
      select: { id: true, allowedModules: true },
    });
    if (!staffCanAccess(row?.allowedModules, moduleKey)) {
      throw new ForbiddenException(
        'This section is not enabled for your account. Ask an administrator if you need access.',
      );
    }
    return true;
  }
}
