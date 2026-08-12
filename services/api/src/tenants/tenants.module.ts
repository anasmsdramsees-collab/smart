import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Membership, Organization, Role, User } from '../database/entities';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { TenantGuard } from './guards/tenant.guard';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Organization, Membership, User, Role]), AuthModule, AuditModule],
  controllers: [TenantsController],
  providers: [TenantsService, TenantGuard],
  // Re-export AuthModule so any module that imports TenantsModule (which nearly
  // every resource module does, for TenantGuard) also gets JwtAuthGuard available
  // in its DI context — Nest does not transitively expose a sub-import's providers
  // otherwise, even though `@UseGuards(JwtAuthGuard, TenantGuard)` is used together
  // everywhere.
  exports: [TenantGuard, TypeOrmModule, AuthModule],
})
export class TenantsModule {}
