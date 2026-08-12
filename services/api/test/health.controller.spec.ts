import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from '../src/health/health.controller';
import { HealthService } from '../src/health/health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: { checkReadiness: jest.Mock };

  beforeEach(async () => {
    healthService = { checkReadiness: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: healthService }],
    }).compile();

    controller = module.get(HealthController);
  });

  it('health() reports ok without checking dependencies', () => {
    expect(controller.health()).toEqual({ status: 'ok' });
    expect(healthService.checkReadiness).not.toHaveBeenCalled();
  });

  it('live() reports ok', () => {
    expect(controller.live()).toEqual({ status: 'ok' });
  });

  it('ready() returns the report when all dependencies are reachable', async () => {
    const report = {
      status: 'ok',
      dependencies: { postgres: 'ok', redis: 'ok', mqtt: 'ok' },
    };
    healthService.checkReadiness.mockResolvedValue(report);

    await expect(controller.ready()).resolves.toEqual(report);
  });

  it('ready() throws 503 when a dependency is unreachable', async () => {
    const report = {
      status: 'degraded',
      dependencies: { postgres: 'unreachable', redis: 'ok', mqtt: 'ok' },
    };
    healthService.checkReadiness.mockResolvedValue(report);

    await expect(controller.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
