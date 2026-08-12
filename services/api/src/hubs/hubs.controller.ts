import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenants/guards/tenant.guard';
import { RolesGuard } from '../tenants/guards/roles.guard';
import { Roles } from '../tenants/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import { RoleName } from '../database/entities';
import { HubsService } from './hubs.service';
import { HubAuthGuard, RequestWithHub } from './guards/hub-auth.guard';
import { CreateHubDto } from './dto/create-hub.dto';

@Controller('v1/organizations/:organizationId/hubs')
@UseGuards(JwtAuthGuard, TenantGuard)
export class HubsController {
  constructor(private readonly hubsService: HubsService) {}

  @Get()
  list(@Param('organizationId') organizationId: string) {
    return this.hubsService.list(organizationId);
  }

  @Get(':hubId')
  getOne(@Param('organizationId') organizationId: string, @Param('hubId') hubId: string) {
    return this.hubsService.getOne(organizationId, hubId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleName.OWNER, RoleName.ADMIN, RoleName.INSTALLER)
  register(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateHubDto,
  ) {
    return this.hubsService.register(organizationId, user.id, dto);
  }
}

@Controller('v1/hubs')
export class HubHeartbeatController {
  constructor(private readonly hubsService: HubsService) {}

  @Post(':hubId/heartbeat')
  @UseGuards(HubAuthGuard)
  heartbeat(@Param('hubId') hubId: string, @Req() request: RequestWithHub) {
    return this.hubsService.recordHeartbeat(request.hub!.id, hubId);
  }
}
