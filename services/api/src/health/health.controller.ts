import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  // Liveness: process is up. Does not depend on downstream services.
  @Get('health')
  @HttpCode(HttpStatus.OK)
  health() {
    return { status: 'ok' };
  }

  @Get('live')
  @HttpCode(HttpStatus.OK)
  live() {
    return { status: 'ok' };
  }

  // Readiness: process is up AND downstream dependencies are reachable.
  @Get('ready')
  async ready() {
    const report = await this.healthService.checkReadiness();
    if (report.status !== 'ok') {
      throw new ServiceUnavailableException(report);
    }
    return report;
  }
}
