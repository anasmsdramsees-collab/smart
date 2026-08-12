import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hub } from '../database/entities';
import { HubsService } from './hubs.service';
import { HubsController, HubHeartbeatController } from './hubs.controller';
import { HubAuthGuard } from './guards/hub-auth.guard';
import { TenantsModule } from '../tenants/tenants.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Hub]), JwtModule.register({}), TenantsModule, AuditModule],
  controllers: [HubsController, HubHeartbeatController],
  providers: [HubsService, HubAuthGuard],
  exports: [TypeOrmModule, HubAuthGuard],
})
export class HubsModule {}
