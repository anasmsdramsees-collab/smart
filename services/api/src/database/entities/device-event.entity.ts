import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Organization } from './organization.entity';
import { Device } from './device.entity';

export enum DeviceEventType {
  DEVICE_DISCOVERED = 'DeviceDiscovered',
  DEVICE_UPDATED = 'DeviceUpdated',
  DEVICE_CONNECTED = 'DeviceConnected',
  DEVICE_DISCONNECTED = 'DeviceDisconnected',
  STATE_CHANGED = 'StateChanged',
  TEMPERATURE_CHANGED = 'TemperatureChanged',
  MOTION_DETECTED = 'MotionDetected',
  ENERGY_UPDATED = 'EnergyUpdated',
  COMMAND_REQUESTED = 'CommandRequested',
  COMMAND_EXECUTED = 'CommandExecuted',
  COMMAND_FAILED = 'CommandFailed',
  AUTOMATION_TRIGGERED = 'AutomationTriggered',
  PLAN_CREATED = 'PlanCreated',
  PLAN_EXECUTED = 'PlanExecuted',
  PLAN_FAILED = 'PlanFailed',
}

@Entity('device_events')
@Index(['organizationId', 'createdAt'])
export class DeviceEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'device_id', nullable: true })
  deviceId?: string;

  @ManyToOne(() => Device, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'device_id' })
  device?: Device;

  @Column()
  type: DeviceEventType;

  @Column({ type: 'jsonb', default: {} })
  payload: Record<string, unknown>;

  @Column({ name: 'correlation_id', nullable: true })
  correlationId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
