import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Organization } from './organization.entity';
import { Property } from './property.entity';

export enum HubStatus {
  PENDING = 'pending',
  ONLINE = 'online',
  OFFLINE = 'offline',
}

@Entity('hubs')
export class Hub {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  @Index()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'property_id', nullable: true })
  propertyId?: string;

  @ManyToOne(() => Property, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'property_id' })
  property?: Property;

  @Column()
  name: string;

  @Column({ name: 'serial_number', unique: true })
  serialNumber: string;

  @Column({ default: HubStatus.PENDING })
  status: HubStatus;

  @Column({ name: 'last_seen_at', type: 'timestamptz', nullable: true })
  lastSeenAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
