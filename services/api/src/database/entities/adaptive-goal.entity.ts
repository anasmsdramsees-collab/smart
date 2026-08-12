import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Organization } from './organization.entity';
import { Room } from './room.entity';

export interface AdaptiveConstraint {
  type: string;
  value: number | string | boolean;
}

export enum GoalStatus {
  ACTIVE = 'active',
  SATISFIED = 'satisfied',
  ABANDONED = 'abandoned',
}

@Entity('adaptive_goals')
export class AdaptiveGoal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'room_id', nullable: true })
  roomId?: string;

  @ManyToOne(() => Room, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'room_id' })
  room?: Room;

  @Column()
  objective: string;

  /** Resident-facing label; set for goals the resident authors themselves. */
  @Column({ nullable: true })
  name?: string;

  @Column({ type: 'jsonb', default: [] })
  constraints: AdaptiveConstraint[];

  /** Higher wins when two active goals target the same device. */
  @Column({ default: 0 })
  priority: number;

  /** Optional daily activation window, stored as HH:mm. */
  @Column({ name: 'active_from', nullable: true })
  activeFrom?: string;

  @Column({ name: 'active_to', nullable: true })
  activeTo?: string;

  @Column({ default: GoalStatus.ACTIVE })
  status: GoalStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
