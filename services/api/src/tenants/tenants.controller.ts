import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from './guards/tenant.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import { RoleName } from '../database/entities';
import { TenantsService } from './tenants.service';
import { InviteMemberDto } from './dto/invite-member.dto';

@Controller('v1/organizations')
@UseGuards(JwtAuthGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.tenantsService.listForUser(user.id);
  }

  @Get(':organizationId')
  @UseGuards(TenantGuard)
  getOne(@Param('organizationId') organizationId: string) {
    return this.tenantsService.getById(organizationId);
  }

  @Get(':organizationId/members')
  @UseGuards(TenantGuard)
  listMembers(@Param('organizationId') organizationId: string) {
    return this.tenantsService.listMembers(organizationId);
  }

  @Post(':organizationId/members')
  @UseGuards(TenantGuard, RolesGuard)
  @Roles(RoleName.OWNER, RoleName.ADMIN)
  inviteMember(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InviteMemberDto,
  ) {
    return this.tenantsService.inviteMember(organizationId, user.id, dto);
  }
}
