import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Property } from '../database/entities';
import { PropertiesService } from './properties.service';
import { PropertiesController } from './properties.controller';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [TypeOrmModule.forFeature([Property]), TenantsModule],
  controllers: [PropertiesController],
  providers: [PropertiesService],
  exports: [TypeOrmModule],
})
export class PropertiesModule {}
