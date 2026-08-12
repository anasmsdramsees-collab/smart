import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { AdaptivePlan } from './adaptive-plan.entity';
import { Device } from './device.entity';

@Entity('adaptive_actions')
export class AdaptiveAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'plan_id' })
  planId: string;

  @ManyToOne(() => AdaptivePlan, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: AdaptivePlan;

  @Column({ name: 'device_id' })
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

  @Column({ default: 'pending' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
