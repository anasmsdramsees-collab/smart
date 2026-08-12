import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Membership, Role } from '../../database/entities';
import { RequestWithUser } from '../../auth/guards/jwt-auth.guard';

export interface RequestWithTenant extends RequestWithUser {
  tenant?: { organizationId: string; role: string };
}

// Requires JwtAuthGuard to run first so request.user is populated.
// Resolves the organization from the :organizationId route param and verifies
// the authenticated user has a membership in it, preventing cross-tenant access.
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(@InjectRepository(Membership) private readonly memberships: Repository<Membership>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithTenant>();
    const organizationId = Array.isArray(request.params.organizationId)
      ? request.params.organizationId[0]
      : request.params.organizationId;

    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }
    if (!request.user) {
      throw new ForbiddenException('Authentication is required before tenant resolution');
    }

    const membership = await this.memberships.findOne({
      where: { organizationId, userId: request.user.id },
      relations: { role: true },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    request.tenant = { organizationId, role: (membership.role as Role).name };
    return true;
  }
}
