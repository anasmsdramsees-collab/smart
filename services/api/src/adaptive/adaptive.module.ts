import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdaptiveAction, AdaptiveGoal, AdaptivePlan, Device, DeviceEvent, DeviceState } from '../database/entities';
import { AdaptiveService } from './adaptive.service';
import { AdaptiveController } from './adaptive.controller';
import { TenantsModule } from '../tenants/tenants.module';
import { CommandsModule } from '../commands/commands.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdaptiveGoal, AdaptivePlan, AdaptiveAction, Device, DeviceState, DeviceEvent]),
    TenantsModule,
    CommandsModule,
  ],
  controllers: [AdaptiveController],
  providers: [AdaptiveService],
  exports: [AdaptiveService],
})
export class AdaptiveModule {}
