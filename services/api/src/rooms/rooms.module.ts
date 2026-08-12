import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Building, Room } from '../database/entities';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [TypeOrmModule.forFeature([Room, Building]), TenantsModule],
  controllers: [RoomsController],
  providers: [RoomsService],
  exports: [TypeOrmModule],
})
export class RoomsModule {}
