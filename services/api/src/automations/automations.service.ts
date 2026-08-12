import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Automation, AutomationRun } from '../database/entities';
import { AutomationActionDto, CreateAutomationDto, DayNightDefinitionDto, ManualDefinitionDto } from './dto/create-automation.dto';
import { UpdateAutomationDto } from './dto/update-automation.dto';
import { CommandsService } from '../commands/commands.service';
import { AuditService } from '../audit/audit.service';

const EVAL_INTERVAL_MS = 60000;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

type Period = 'day' | 'night';

@Injectable()
export class AutomationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutomationsService.name);
  private evalTimer?: NodeJS.Timeout;
  // In-memory last-applied period per automation, so a 60s sweep doesn't
  // re-fire the same actions every minute — only on an actual day<->night
  // transition. Not persisted: acceptable for a demo scenario; a restart
  // just re-applies once on the next transition.
  private readonly lastPeriod = new Map<string, Period>();

  constructor(
    @InjectRepository(Automation) private readonly automations: Repository<Automation>,
    @InjectRepository(AutomationRun) private readonly runs: Repository<AutomationRun>,
    private readonly commandsService: CommandsService,
    private readonly auditService: AuditService,
  ) {}

  onModuleInit(): void {
    this.evalTimer = setInterval(() => {
      this.evaluateAll().catch((err) => this.logger.error(`Automation sweep failed: ${err.message}`));
    }, EVAL_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.evalTimer) clearInterval(this.evalTimer);
  }

  async create(organizationId: string, actorUserId: string, dto: CreateAutomationDto): Promise<Automation> {
    this.validateDefinition(dto.definition);
    const automation = await this.automations.save(
      this.automations.create({
        organizationId,
        roomId: dto.roomId,
        name: dto.name,
        definition: dto.definition as unknown as Record<string, unknown>,
        enabled: true,
      }),
    );
    await this.auditService.record({
      organizationId,
      actorUserId,
      action: 'automation.created',
      targetType: 'automation',
      targetId: automation.id,
    });
    return automation;
  }

  list(organizationId: string): Promise<Automation[]> {
    return this.automations.find({ where: { organizationId }, order: { createdAt: 'DESC' } });
  }

  async update(organizationId: string, automationId: string, actorUserId: string, dto: UpdateAutomationDto): Promise<Automation> {
    const automation = await this.automations.findOne({ where: { id: automationId, organizationId } });
    if (!automation) {
      throw new NotFoundException('Automation not found');
    }
    if (dto.enabled !== undefined) {
      automation.enabled = dto.enabled;
    }
    await this.auditService.record({
      organizationId,
      actorUserId,
      action: 'automation.updated',
      targetType: 'automation',
      targetId: automation.id,
      metadata: { enabled: automation.enabled },
    });
    return this.automations.save(automation);
  }

  async remove(organizationId: string, automationId: string, actorUserId: string): Promise<void> {
    const automation = await this.automations.findOne({ where: { id: automationId, organizationId } });
    if (!automation) {
      throw new NotFoundException('Automation not found');
    }
    this.lastPeriod.delete(automation.id);
    await this.automations.remove(automation);
    await this.auditService.record({
      organizationId,
      actorUserId,
      action: 'automation.deleted',
      targetType: 'automation',
      targetId: automationId,
    });
  }

  async listRuns(organizationId: string, automationId: string): Promise<AutomationRun[]> {
    const automation = await this.automations.findOne({ where: { id: automationId, organizationId } });
    if (!automation) {
      throw new NotFoundException('Automation not found');
    }
    return this.runs.find({ where: { automationId }, order: { startedAt: 'DESC' }, take: 20 });
  }

  // Manual/instant trigger (e.g. Emergency Mode, Cinema, Party) — runs
  // immediately regardless of the day/night scheduler, and is not gated by
  // `enabled` since a manual definition has no scheduled evaluation to
  // disable in the first place. state:'on' (default) runs `actions`;
  // state:'off' runs `offActions` if the scenario defines one, letting the
  // user switch it back off instead of it being a one-shot fire.
  async trigger(organizationId: string, automationId: string, actorUserId: string, state: 'on' | 'off' = 'on'): Promise<AutomationRun> {
    const automation = await this.automations.findOne({ where: { id: automationId, organizationId } });
    if (!automation) {
      throw new NotFoundException('Automation not found');
    }
    const definition = automation.definition as unknown as ManualDefinitionDto | DayNightDefinitionDto;
    if (definition.type !== 'manual') {
      throw new BadRequestException('Only manual automations can be triggered directly');
    }

    const actions = state === 'off' ? definition.offActions : definition.actions;
    if (!actions || actions.length === 0) {
      throw new BadRequestException(
        state === 'off' ? 'This scenario has no offActions defined, so it cannot be switched off' : 'This scenario has no actions defined',
      );
    }

    await this.auditService.record({
      organizationId,
      actorUserId,
      action: state === 'off' ? 'automation.deactivated' : 'automation.triggered',
      targetType: 'automation',
      targetId: automation.id,
    });

    return this.executeActions(automation, actions, state === 'off' ? 'manual-off' : 'manual');
  }

  private validateDefinition(definition: DayNightDefinitionDto | ManualDefinitionDto): void {
    if (!definition || typeof definition !== 'object') {
      throw new BadRequestException('definition is required');
    }
    if (definition.type === 'day_night') {
      const d = definition as DayNightDefinitionDto;
      if (!TIME_PATTERN.test(d.dayStart) || !TIME_PATTERN.test(d.nightStart)) {
        throw new BadRequestException('dayStart/nightStart must be HH:mm (24h)');
      }
      this.validateActions(d.dayActions, 'dayActions');
      this.validateActions(d.nightActions, 'nightActions');
    } else if (definition.type === 'manual') {
      const d = definition as ManualDefinitionDto;
      this.validateActions(d.actions, 'actions');
      if (d.offActions !== undefined) {
        this.validateActions(d.offActions, 'offActions');
      }
    } else {
      throw new BadRequestException("definition.type must be 'day_night' or 'manual'");
    }
  }

  private validateActions(actions: unknown, field: string): asserts actions is AutomationActionDto[] {
    if (!Array.isArray(actions) || actions.length === 0) {
      throw new BadRequestException(`${field} must be a non-empty array`);
    }
    for (const action of actions) {
      if (!action || typeof action !== 'object' || typeof (action as AutomationActionDto).deviceId !== 'string') {
        throw new BadRequestException(`${field} contains an invalid action`);
      }
    }
  }

  private async evaluateAll(): Promise<void> {
    const active = await this.automations.find({ where: { enabled: true } });
    for (const automation of active) {
      const definition = automation.definition as unknown as DayNightDefinitionDto;
      if (definition?.type !== 'day_night') continue;
      await this.evaluateDayNight(automation, definition);
    }
  }

  private async evaluateDayNight(automation: Automation, definition: DayNightDefinitionDto): Promise<void> {
    const period = this.resolvePeriod(definition.dayStart, definition.nightStart);
    const previous = this.lastPeriod.get(automation.id);
    if (previous === period) return;

    this.lastPeriod.set(automation.id, period);
    const actions = period === 'day' ? definition.dayActions : definition.nightActions;
    await this.executeActions(automation, actions, period);
  }

  private async executeActions(automation: Automation, actions: AutomationActionDto[], label: string): Promise<AutomationRun> {
    const run = await this.runs.save(
      this.runs.create({ automationId: automation.id, status: 'running', startedAt: new Date() }),
    );

    let succeeded = 0;
    let failed = 0;
    for (const action of actions) {
      try {
        await this.commandsService.send(automation.organizationId, action.deviceId, 'automation', {
          capability: action.capability,
          action: action.action,
          value: action.value,
        });
        succeeded++;
      } catch (err) {
        failed++;
        this.logger.warn(`Automation ${automation.id} action on ${action.deviceId} failed: ${(err as Error).message}`);
      }
    }

    run.status = failed === 0 ? 'succeeded' : succeeded === 0 ? 'failed' : 'partial';
    run.finishedAt = new Date();
    run.result = { period: label, succeeded, failed };
    await this.runs.save(run);

    this.logger.log(`Automation "${automation.name}" (${label}): ${succeeded} ok, ${failed} failed`);
    return run;
  }

  private resolvePeriod(dayStart: string, nightStart: string): Period {
    const now = new Date();
    const minutesNow = now.getHours() * 60 + now.getMinutes();
    const dayMinutes = this.toMinutes(dayStart);
    const nightMinutes = this.toMinutes(nightStart);

    if (dayMinutes < nightMinutes) {
      return minutesNow >= dayMinutes && minutesNow < nightMinutes ? 'day' : 'night';
    }
    // Handles a dayStart/nightStart pair that wraps past midnight.
    return minutesNow >= dayMinutes || minutesNow < nightMinutes ? 'day' : 'night';
  }

  private toMinutes(hhmm: string): number {
    const [hours, minutes] = hhmm.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
