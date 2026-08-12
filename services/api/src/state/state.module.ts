import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Device, DeviceEvent, DeviceState } from '../database/entities';
import { StateService } from './state.service';
import { StateController } from './state.controller';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [TypeOrmModule.forFeature([DeviceState, Device, DeviceEvent]), TenantsModule],
  controllers: [StateController],
  providers: [StateService],
  exports: [StateService],
})
export class StateModule {}
