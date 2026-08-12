import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Organization } from './organization.entity';
import { Hub } from './hub.entity';
import { Room } from './room.entity';

export enum DeviceStatus {
  UNKNOWN = 'unknown',
  ONLINE = 'online',
  OFFLINE = 'offline',
}

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  @Index()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'hub_id' })
  @Index()
  hubId: string;

  @ManyToOne(() => Hub, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hub_id' })
  hub: Hub;

  @Column({ name: 'room_id', nullable: true })
  roomId?: string;

  @ManyToOne(() => Room, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'room_id' })
  room?: Room;

  // Stable SYLTRA identity, e.g. "AC-LIVING-01". Never a Home Assistant entity id.
  @Column({ name: 'device_key', unique: true })
  deviceKey: string;

  // Home Assistant entity_id or other source-system identifier, e.g. "climate.living_room".
  @Column({ name: 'external_ref', nullable: true })
  externalRef?: string;

  @Column()
  name: string;

  @Column()
  type: string;

  @Column({ nullable: true })
  manufacturer?: string;

  @Column({ nullable: true })
  model?: string;

  @Column({ default: DeviceStatus.UNKNOWN })
  status: DeviceStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
