import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenants/guards/tenant.guard';
import { HubAuthGuard, RequestWithHub } from '../hubs/guards/hub-auth.guard';
import { DevicesService } from './devices.service';
import { UpsertDeviceDto } from './dto/upsert-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@Controller('v1/organizations/:organizationId/devices')
@UseGuards(JwtAuthGuard, TenantGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  list(@Param('organizationId') organizationId: string) {
    return this.devicesService.list(organizationId);
  }

  @Get(':deviceId')
  getOne(@Param('organizationId') organizationId: string, @Param('deviceId') deviceId: string) {
    return this.devicesService.getOne(organizationId, deviceId);
  }

  @Get(':deviceId/capabilities')
  listCapabilities(@Param('organizationId') organizationId: string, @Param('deviceId') deviceId: string) {
    return this.devicesService.listCapabilities(organizationId, deviceId);
  }

  @Patch(':deviceId')
  update(
    @Param('organizationId') organizationId: string,
    @Param('deviceId') deviceId: string,
    @Body() dto: UpdateDeviceDto,
  ) {
    return this.devicesService.update(organizationId, deviceId, dto);
  }
}

// Called by the SYLTRA Edge Agent (hub identity, not a user) during device discovery.
@Controller('v1/hubs/:hubId/devices')
export class HubDeviceDiscoveryController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  @UseGuards(HubAuthGuard)
  upsert(@Param('hubId') hubId: string, @Req() request: RequestWithHub, @Body() dto: UpsertDeviceDto) {
    if (hubId !== request.hub!.id) {
      throw new ForbiddenException('Hub token does not match the requested hub');
    }
    return this.devicesService.upsertFromDiscovery(hubId, dto);
  }
}
