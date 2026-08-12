import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenants/guards/tenant.guard';
import { StateService } from './state.service';

@Controller('v1/organizations/:organizationId/devices/:deviceId/states')
@UseGuards(JwtAuthGuard, TenantGuard)
export class StateController {
  constructor(private readonly stateService: StateService) {}

  @Get()
  getLatest(@Param('organizationId') organizationId: string, @Param('deviceId') deviceId: string) {
    return this.stateService.getLatest(organizationId, deviceId);
  }

  @Get(':capability/history')
  getHistory(
    @Param('organizationId') organizationId: string,
    @Param('deviceId') deviceId: string,
    @Param('capability') capability: string,
    @Query('limit') limit?: string,
  ) {
    return this.stateService.getHistory(organizationId, deviceId, capability, limit ? parseInt(limit, 10) : undefined);
  }
}
