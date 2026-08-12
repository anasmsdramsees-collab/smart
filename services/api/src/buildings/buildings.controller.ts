import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenants/guards/tenant.guard';
import { BuildingsService } from './buildings.service';
import { CreateBuildingDto } from './dto/create-building.dto';

@Controller('v1/organizations/:organizationId/properties/:propertyId/buildings')
@UseGuards(JwtAuthGuard, TenantGuard)
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @Get()
  list(@Param('organizationId') organizationId: string, @Param('propertyId') propertyId: string) {
    return this.buildingsService.list(organizationId, propertyId);
  }

  @Post()
  create(
    @Param('organizationId') organizationId: string,
    @Param('propertyId') propertyId: string,
    @Body() dto: CreateBuildingDto,
  ) {
    return this.buildingsService.create(organizationId, propertyId, dto);
  }
}
