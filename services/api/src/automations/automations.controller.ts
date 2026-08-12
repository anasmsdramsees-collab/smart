import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenants/guards/tenant.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import { AutomationsService } from './automations.service';
import { CreateAutomationDto } from './dto/create-automation.dto';
import { UpdateAutomationDto } from './dto/update-automation.dto';
import { TriggerAutomationDto } from './dto/trigger-automation.dto';

@Controller('v1/organizations/:organizationId/automations')
@UseGuards(JwtAuthGuard, TenantGuard)
export class AutomationsController {
  constructor(private readonly automationsService: AutomationsService) {}

  @Get()
  list(@Param('organizationId') organizationId: string) {
    return this.automationsService.list(organizationId);
  }

  @Post()
  create(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAutomationDto,
  ) {
    return this.automationsService.create(organizationId, user.id, dto);
  }

  @Patch(':automationId')
  update(
    @Param('organizationId') organizationId: string,
    @Param('automationId') automationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateAutomationDto,
  ) {
    return this.automationsService.update(organizationId, automationId, user.id, dto);
  }

  @Delete(':automationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('organizationId') organizationId: string,
    @Param('automationId') automationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.automationsService.remove(organizationId, automationId, user.id);
  }

  @Get(':automationId/runs')
  listRuns(@Param('organizationId') organizationId: string, @Param('automationId') automationId: string) {
    return this.automationsService.listRuns(organizationId, automationId);
  }

  @Post(':automationId/trigger')
  trigger(
    @Param('organizationId') organizationId: string,
    @Param('automationId') automationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: TriggerAutomationDto,
  ) {
    return this.automationsService.trigger(organizationId, automationId, user.id, dto.state ?? 'on');
  }
}
