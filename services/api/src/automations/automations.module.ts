import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Automation, AutomationRun } from '../database/entities';
import { AutomationsService } from './automations.service';
import { AutomationsController } from './automations.controller';
import { TenantsModule } from '../tenants/tenants.module';
import { CommandsModule } from '../commands/commands.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Automation, AutomationRun]), TenantsModule, CommandsModule, AuditModule],
  controllers: [AutomationsController],
  providers: [AutomationsService],
  exports: [AutomationsService],
})
export class AutomationsModule {}
