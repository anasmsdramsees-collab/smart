import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenants/guards/tenant.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import { CommandsService } from './commands.service';
import { SendCommandDto } from './dto/send-command.dto';

@Controller('v1/organizations/:organizationId/devices/:deviceId/commands')
@UseGuards(JwtAuthGuard, TenantGuard)
export class CommandsController {
  constructor(private readonly commandsService: CommandsService) {}

  @Post()
  send(
    @Param('organizationId') organizationId: string,
    @Param('deviceId') deviceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendCommandDto,
  ) {
    return this.commandsService.send(organizationId, deviceId, user.id, dto);
  }

  @Get(':commandId')
  getOne(@Param('organizationId') organizationId: string, @Param('commandId') commandId: string) {
    return this.commandsService.getOne(organizationId, commandId);
  }
}
