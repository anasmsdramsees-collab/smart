import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName } from '../../database/entities';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RequestWithTenant } from './tenant.guard';

// Requires TenantGuard to run first so request.tenant is populated.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithTenant>();
    const role = request.tenant?.role as RoleName | undefined;
    if (!role || !requiredRoles.includes(role)) {
      throw new ForbiddenException('Your role does not permit this action');
    }
    return true;
  }
}
