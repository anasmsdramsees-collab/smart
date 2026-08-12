import { Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AdaptiveAction,
  AdaptiveConstraint,
  AdaptiveGoal,
  AdaptivePlan,
  Device,
  DeviceEvent,
  DeviceEventType,
  DeviceState,
  GoalStatus,
  PlanStatus,
  PlanStep,
} from '../database/entities';
import { CreateGoalDto } from './dto/create-goal.dto';
import { CommandsService } from '../commands/commands.service';

const COMFORT_DEFAULT_TARGET_C = 24;
const ENERGY_SAVING_TARGET_C = 26;
const SLEEP_TARGET_C = 21;
const SLEEP_BRIGHTNESS_MAX = 10;
const RECONCILE_TOLERANCE_C = 1;
const RECONCILE_INTERVAL_MS = 60000;

@Injectable()
export class AdaptiveService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AdaptiveService.name);
  private reconcileTimer?: NodeJS.Timeout;

  constructor(
    @InjectRepository(AdaptiveGoal) private readonly goals: Repository<AdaptiveGoal>,
    @InjectRepository(AdaptivePlan) private readonly plans: Repository<AdaptivePlan>,
    @InjectRepository(AdaptiveAction) private readonly actions: Repository<AdaptiveAction>,
    @InjectRepository(Device) private readonly devices: Repository<Device>,
    @InjectRepository(DeviceState) private readonly states: Repository<DeviceState>,
    @InjectRepository(DeviceEvent) private readonly events: Repository<DeviceEvent>,
    private readonly commandsService: CommandsService,
  ) {}

  onModuleInit(): void {
    // Continuous Reconciliation (section 04/12/29): periodically compares desired
    // vs. observed state for every active goal and replans on drift.
    this.reconcileTimer = setInterval(() => {
      this.reconcileActiveGoals().catch((err) => this.logger.error(`Reconciliation sweep failed: ${err.message}`));
    }, RECONCILE_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.reconcileTimer) {
      clearInterval(this.reconcileTimer);
    }
  }

  async createGoal(organizationId: string, dto: CreateGoalDto): Promise<AdaptiveGoal> {
    const goal = await this.goals.save(
      this.goals.create({
        organizationId,
        roomId: dto.roomId,
        objective: dto.objective,
        name: dto.name,
        constraints: (dto.constraints as AdaptiveConstraint[]) ?? [],
        priority: dto.priority ?? 0,
        activeFrom: dto.activeFrom,
        activeTo: dto.activeTo,
        status: GoalStatus.ACTIVE,
      }),
    );
    await this.planAndExecute(goal);
    return goal;
  }

  async getGoal(organizationId: string, goalId: string): Promise<AdaptiveGoal> {
    const goal = await this.goals.findOne({ where: { id: goalId, organizationId } });
    if (!goal) {
      throw new NotFoundException('Adaptive goal not found');
    }
    return goal;
  }

  listGoals(organizationId: string): Promise<AdaptiveGoal[]> {
    return this.goals.find({ where: { organizationId }, order: { createdAt: 'DESC' } });
  }

  async setGoalStatus(organizationId: string, goalId: string, status: GoalStatus): Promise<AdaptiveGoal> {
    const goal = await this.getGoal(organizationId, goalId);
    goal.status = status;
    return this.goals.save(goal);
  }

  async listPlans(organizationId: string, goalId: string): Promise<AdaptivePlan[]> {
    await this.getGoal(organizationId, goalId);
    return this.plans.find({ where: { goalId }, order: { createdAt: 'DESC' } });
  }

  // Sense -> Understand -> Plan -> Act -> Observe -> Adapt (section 11 & 26).
  private async planAndExecute(goal: AdaptiveGoal): Promise<AdaptivePlan | undefined> {
    const steps = await this.generatePlanSteps(goal);
    if (steps.length === 0) {
      this.logger.warn(`No actionable devices found for goal ${goal.id} (objective=${goal.objective})`);
      return undefined;
    }

    const plan = await this.plans.save(this.plans.create({ goalId: goal.id, plan: steps, status: PlanStatus.PENDING }));
    await this.logEvent(goal.organizationId, undefined, DeviceEventType.PLAN_CREATED, { goalId: goal.id, planId: plan.id });

    await this.executePlan(goal, plan);
    return plan;
  }

  /**
   * An objective is just a set of default constraints; `resolveConstraints`
   * fills those in and `compileConstraints` turns the merged set into device
   * commands. A `custom` goal runs the same path with no defaults, which is
   * what lets a resident author their own goal without new planner code.
   */
  private async generatePlanSteps(goal: AdaptiveGoal): Promise<PlanStep[]> {
    if (!goal.roomId) {
      return [];
    }

    const devices = await this.devices.find({ where: { roomId: goal.roomId } });
    if (devices.length === 0) {
      return [];
    }

    const byType = (type: string) => devices.filter((d) => d.type === type);
    const constraints = this.resolveConstraints(goal);
    const steps: PlanStep[] = [];

    for (const [type, value] of Object.entries(constraints)) {
      if (value === undefined) continue;

      switch (type) {
        case 'temperature':
          steps.push(
            ...byType('hvac').map((d) => ({
              deviceId: d.id,
              capability: 'temperature',
              action: 'set',
              value,
            })),
          );
          break;
        case 'brightness_max':
          steps.push(
            ...byType('light').map((d) => ({
              deviceId: d.id,
              capability: 'brightness',
              action: 'set',
              value,
            })),
          );
          break;
        case 'lights_off':
          if (value === true) {
            steps.push(
              ...byType('light').map((d) => ({
                deviceId: d.id,
                capability: 'power',
                action: 'set',
                value: false,
              })),
            );
          }
          break;
        case 'blinds_position':
          steps.push(
            ...byType('blinds').map((d) => ({
              deviceId: d.id,
              capability: 'position',
              action: 'set',
              value,
            })),
          );
          break;
        case 'doors_locked':
          steps.push(
            ...byType('lock').map((d) => ({
              deviceId: d.id,
              capability: 'locked',
              action: 'set',
              value,
            })),
          );
          break;
        case 'switches_off':
          if (value === true) {
            steps.push(
              ...byType('switch').map((d) => ({
                deviceId: d.id,
                capability: 'power',
                action: 'set',
                value: false,
              })),
            );
          }
          break;
        default:
          break;
      }
    }

    return steps;
  }

  /**
   * Merges the objective's defaults with whatever the resident set explicitly —
   * an explicit constraint always wins, so "energy saving but keep it at 25"
   * behaves the way it reads.
   */
  private resolveConstraints(goal: AdaptiveGoal): Record<string, number | boolean | undefined> {
    const explicit = new Map(goal.constraints.map((c) => [c.type, c.value]));
    const num = (k: string) => explicit.get(k) as number | undefined;
    const bool = (k: string) => explicit.get(k) as boolean | undefined;

    const resolved: Record<string, number | boolean | undefined> = {
      temperature: this.resolveComfortTarget(goal.constraints),
      brightness_max: num('brightness_max'),
      lights_off: bool('lights_off'),
      blinds_position: num('blinds_position'),
      doors_locked: bool('doors_locked'),
      switches_off: bool('switches_off'),
    };

    switch (goal.objective) {
      case 'comfort':
        // Temperature only — already resolved above.
        break;
      case 'energy_saving':
        resolved.lights_off = bool('lights_off') ?? true;
        resolved.switches_off = bool('switches_off') ?? true;
        resolved.temperature = num('temperature_max') ?? ENERGY_SAVING_TARGET_C;
        break;
      case 'security':
        resolved.doors_locked = bool('doors_locked') ?? true;
        resolved.blinds_position = num('blinds_position') ?? 0;
        break;
      case 'sleep':
        resolved.brightness_max = num('brightness_max') ?? SLEEP_BRIGHTNESS_MAX;
        resolved.blinds_position = num('blinds_position') ?? 0;
        resolved.temperature = this.hasTemperatureConstraint(goal.constraints)
          ? this.resolveComfortTarget(goal.constraints)
          : SLEEP_TARGET_C;
        break;
      case 'custom':
        // Nothing implied: the resident's constraints are the whole goal.
        if (!this.hasTemperatureConstraint(goal.constraints)) {
          resolved.temperature = undefined;
        }
        break;
      default:
        break;
    }

    return resolved;
  }

  private hasTemperatureConstraint(constraints: AdaptiveConstraint[]): boolean {
    return constraints.some((c) => c.type === 'temperature_min' || c.type === 'temperature_max');
  }

  /** True when the goal is outside its daily activation window. */
  private isDormant(goal: AdaptiveGoal, now = new Date()): boolean {
    const { activeFrom, activeTo } = goal;
    if (!activeFrom || !activeTo) return false;

    const minutes = now.getHours() * 60 + now.getMinutes();
    const toMinutes = (hhmm: string) => {
      const [h, m] = hhmm.split(':').map(Number);
      return h * 60 + m;
    };
    const from = toMinutes(activeFrom);
    const to = toMinutes(activeTo);

    // A window that ends before it starts wraps past midnight (e.g. 22:00–07:00).
    return from <= to ? minutes < from || minutes >= to : minutes < from && minutes >= to;
  }

  private resolveComfortTarget(constraints: AdaptiveConstraint[]): number {
    const min = constraints.find((c) => c.type === 'temperature_min')?.value as number | undefined;
    const max = constraints.find((c) => c.type === 'temperature_max')?.value as number | undefined;
    if (min !== undefined && max !== undefined) {
      return Math.round(((min + max) / 2) * 10) / 10;
    }
    return min ?? max ?? COMFORT_DEFAULT_TARGET_C;
  }

  private async executePlan(goal: AdaptiveGoal, plan: AdaptivePlan): Promise<void> {
    plan.status = PlanStatus.EXECUTING;
    await this.plans.save(plan);

    let allSucceeded = true;
    for (const step of plan.plan) {
      const action = await this.actions.save(
        this.actions.create({
          planId: plan.id,
          deviceId: step.deviceId,
          capability: step.capability,
          action: step.action,
          value: step.value,
          status: 'pending',
        }),
      );

      try {
        await this.commandsService.send(goal.organizationId, step.deviceId, 'adaptive-core', {
          capability: step.capability,
          action: step.action,
          value: step.value,
        });
        action.status = 'sent';
        await this.actions.save(action);
      } catch (err) {
        allSucceeded = false;
        action.status = 'failed';
        await this.actions.save(action);
        this.logger.error(`Adaptive action ${action.id} failed: ${(err as Error).message}`);
      }
    }

    plan.status = allSucceeded ? PlanStatus.SUCCEEDED : PlanStatus.FAILED;
    await this.plans.save(plan);
    await this.logEvent(
      goal.organizationId,
      undefined,
      allSucceeded ? DeviceEventType.PLAN_EXECUTED : DeviceEventType.PLAN_FAILED,
      { goalId: goal.id, planId: plan.id },
    );
  }

  private async reconcileActiveGoals(): Promise<void> {
    const activeGoals = await this.goals.find({ where: { status: GoalStatus.ACTIVE } });
    // Highest priority last, so a stronger goal's commands land on top when two
    // goals touch the same device in one sweep.
    const ordered = activeGoals.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    for (const goal of ordered) {
      if (this.isDormant(goal)) continue;
      await this.reconcileGoal(goal);
    }
  }

  private async reconcileGoal(goal: AdaptiveGoal): Promise<void> {
    if (!goal.roomId || goal.objective !== 'comfort') return;

    const latestPlan = await this.plans.findOne({ where: { goalId: goal.id }, order: { createdAt: 'DESC' } });
    if (!latestPlan || latestPlan.status !== PlanStatus.SUCCEEDED) return;

    const target = this.resolveComfortTarget(goal.constraints);
    const hvacDevices = await this.devices.find({ where: { roomId: goal.roomId, type: 'hvac' } });

    for (const device of hvacDevices) {
      const observed = await this.states.findOne({
        where: { deviceId: device.id, capability: 'temperature' },
        order: { observedAt: 'DESC' },
      });
      if (!observed) continue;

      const observedValue = Number(observed.value);
      if (Number.isNaN(observedValue)) continue;

      if (Math.abs(observedValue - target) > RECONCILE_TOLERANCE_C) {
        this.logger.log(
          `Reconciling goal ${goal.id}: observed ${observedValue}°C vs desired ${target}°C on device ${device.id} — replanning`,
        );
        latestPlan.status = PlanStatus.REPLANNED;
        await this.plans.save(latestPlan);
        await this.planAndExecute(goal);
        return;
      }
    }
  }

  private async logEvent(
    organizationId: string,
    deviceId: string | undefined,
    type: DeviceEventType,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.events.save(this.events.create({ organizationId, deviceId, type, payload }));
  }
}
