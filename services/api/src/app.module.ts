import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { PropertiesModule } from './properties/properties.module';
import { BuildingsModule } from './buildings/buildings.module';
import { RoomsModule } from './rooms/rooms.module';
import { HubsModule } from './hubs/hubs.module';
import { DevicesModule } from './devices/devices.module';
import { StateModule } from './state/state.module';
import { CommandsModule } from './commands/commands.module';
import { MqttModule } from './mqtt/mqtt.module';
import { AdaptiveModule } from './adaptive/adaptive.module';
import { SilaModule } from './sila/sila.module';
import { AuditModule } from './audit/audit.module';
import { AutomationsModule } from './automations/automations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    DatabaseModule,
    AuditModule,
    HealthModule,
    AuthModule,
    TenantsModule,
    PropertiesModule,
    BuildingsModule,
    RoomsModule,
    HubsModule,
    DevicesModule,
    StateModule,
    CommandsModule,
    MqttModule,
    AdaptiveModule,
    SilaModule,
    AutomationsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
