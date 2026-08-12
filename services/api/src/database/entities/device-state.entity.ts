import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Device } from './device.entity';

export type StateQuality = 'valid' | 'stale' | 'unknown';

@Entity('device_states')
@Index(['deviceId', 'capability', 'observedAt'])
export class DeviceState {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'device_id' })
  deviceId: string;

  @ManyToOne(() => Device, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'device_id' })
  device: Device;

  @Column()
  capability: string;

  @Column({ type: 'jsonb' })
  value: unknown;

  @Column({ nullable: true })
  unit?: string;

  @Column()
  source: string;

  @Column({ default: 'valid' })
  quality: StateQuality;

  @Column({ name: 'observed_at', type: 'timestamptz' })
  observedAt: Date;
}
