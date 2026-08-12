import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Automation } from './automation.entity';

@Entity('automation_runs')
export class AutomationRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'automation_id' })
  automationId: string;

  @ManyToOne(() => Automation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'automation_id' })
  automation: Automation;

  @Column({ default: 'running' })
  status: string;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  result?: Record<string, unknown>;
}
