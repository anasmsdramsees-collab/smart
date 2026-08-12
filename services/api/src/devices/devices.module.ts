import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Device, DeviceCapability, DeviceEvent, Hub, Room } from '../database/entities';
import { DevicesService } from './devices.service';
import { DevicesController, HubDeviceDiscoveryController } from './devices.controller';
import { TenantsModule } from '../tenants/tenants.module';
import { HubsModule } from '../hubs/hubs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device, DeviceCapability, DeviceEvent, Hub, Room]),
    JwtModule.register({}),
    TenantsModule,
    HubsModule,
  ],
  controllers: [DevicesController, HubDeviceDiscoveryController],
  providers: [DevicesService],
  exports: [TypeOrmModule, DevicesService],
})
export class DevicesModule {}
