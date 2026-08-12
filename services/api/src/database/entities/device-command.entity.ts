import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Organization } from './organization.entity';
import { Device } from './device.entity';

export enum CommandStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  TIMEOUT = 'TIMEOUT',
  CANCELLED = 'CANCELLED',
}

@Entity('device_commands')
export class DeviceCommand {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'device_id' })
  @Index()
  deviceId: string;

  @ManyToOne(() => Device, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'device_id' })
  device: Device;

  @Column()
  capability: string;

  @Column()
  action: string;

  @Column({ type: 'jsonb', nullable: true })
  value?: unknown;

  @Column({ default: CommandStatus.PENDING })
  status: CommandStatus;

  @Column({ name: 'requested_by' })
  requestedBy: string;

  @Column({ name: 'correlation_id' })
  @Index()
  correlationId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
