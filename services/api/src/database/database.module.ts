import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyltraConfig } from '../config/configuration';
import { entities } from './entities';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<SyltraConfig, true>) => {
        const postgres = configService.get('postgres', { infer: true });
        return {
          type: 'postgres' as const,
          host: postgres.host,
          port: postgres.port,
          username: postgres.user,
          password: postgres.password,
          database: postgres.database,
          entities,
          synchronize: false,
          autoLoadEntities: false,
        };
      },
    }),
    TypeOrmModule.forFeature(entities),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
