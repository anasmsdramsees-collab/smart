import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenants/guards/tenant.guard';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';

@Controller('v1/organizations/:organizationId/properties')
@UseGuards(JwtAuthGuard, TenantGuard)
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()
  list(@Param('organizationId') organizationId: string) {
    return this.propertiesService.list(organizationId);
  }

  @Get(':propertyId')
  getOne(@Param('organizationId') organizationId: string, @Param('propertyId') propertyId: string) {
    return this.propertiesService.getOne(organizationId, propertyId);
  }

  @Post()
  create(@Param('organizationId') organizationId: string, @Body() dto: CreatePropertyDto) {
    return this.propertiesService.create(organizationId, dto);
  }
}
