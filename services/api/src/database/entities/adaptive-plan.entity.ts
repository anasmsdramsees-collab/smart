import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { AdaptiveGoal } from './adaptive-goal.entity';

export enum PlanStatus {
  PENDING = 'pending',
  EXECUTING = 'executing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  REPLANNED = 'replanned',
}

export interface PlanStep {
  deviceId: string;
  capability: string;
  action: string;
  value?: unknown;
}

@Entity('adaptive_plans')
export class AdaptivePlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'goal_id' })
  goalId: string;

  @ManyToOne(() => AdaptiveGoal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'goal_id' })
  goal: AdaptiveGoal;

  @Column({ type: 'jsonb' })
  plan: PlanStep[];

  @Column({ default: PlanStatus.PENDING })
  status: PlanStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
