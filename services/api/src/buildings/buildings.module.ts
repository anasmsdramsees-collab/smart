import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Building, Property } from '../database/entities';
import { BuildingsService } from './buildings.service';
import { BuildingsController } from './buildings.controller';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [TypeOrmModule.forFeature([Building, Property]), TenantsModule],
  controllers: [BuildingsController],
  providers: [BuildingsService],
  exports: [TypeOrmModule],
})
export class BuildingsModule {}
