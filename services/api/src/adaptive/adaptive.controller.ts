import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenants/guards/tenant.guard';
import { AdaptiveService } from './adaptive.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';

@Controller('v1/organizations/:organizationId/adaptive/goals')
@UseGuards(JwtAuthGuard, TenantGuard)
export class AdaptiveController {
  constructor(private readonly adaptiveService: AdaptiveService) {}

  @Get()
  list(@Param('organizationId') organizationId: string) {
    return this.adaptiveService.listGoals(organizationId);
  }

  @Post()
  create(@Param('organizationId') organizationId: string, @Body() dto: CreateGoalDto) {
    return this.adaptiveService.createGoal(organizationId, dto);
  }

  @Get(':goalId')
  getOne(@Param('organizationId') organizationId: string, @Param('goalId') goalId: string) {
    return this.adaptiveService.getGoal(organizationId, goalId);
  }

  @Patch(':goalId')
  updateStatus(
    @Param('organizationId') organizationId: string,
    @Param('goalId') goalId: string,
    @Body() dto: UpdateGoalDto,
  ) {
    return this.adaptiveService.setGoalStatus(organizationId, goalId, dto.status);
  }

  @Get(':goalId/plans')
  listPlans(@Param('organizationId') organizationId: string, @Param('goalId') goalId: string) {
    return this.adaptiveService.listPlans(organizationId, goalId);
  }
}
