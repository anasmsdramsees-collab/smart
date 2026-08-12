import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenants/guards/tenant.guard';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';

@Controller('v1/organizations/:organizationId/buildings/:buildingId/rooms')
@UseGuards(JwtAuthGuard, TenantGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  list(@Param('organizationId') organizationId: string, @Param('buildingId') buildingId: string) {
    return this.roomsService.list(organizationId, buildingId);
  }

  @Post()
  create(
    @Param('organizationId') organizationId: string,
    @Param('buildingId') buildingId: string,
    @Body() dto: CreateRoomDto,
  ) {
    return this.roomsService.create(organizationId, buildingId, dto);
  }
}
