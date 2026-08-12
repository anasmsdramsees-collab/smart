import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Organization } from './organization.entity';
import { Room } from './room.entity';

@Entity('automations')
export class Automation {
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
  name: string;

  @Column({ type: 'jsonb' })
  definition: Record<string, unknown>;

  @Column({ default: true })
  enabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
