import { Module } from '@nestjs/common';
import { SilaService } from './sila.service';
import { SilaController } from './sila.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SilaController],
  providers: [SilaService],
})
export class SilaModule {}
