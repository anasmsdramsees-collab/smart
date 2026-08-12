import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Hub } from './hub.entity';
import { Device } from './device.entity';

@Entity('firmware_versions')
export class FirmwareVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'hub_id', nullable: true })
  hubId?: string;

  @ManyToOne(() => Hub, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'hub_id' })
  hub?: Hub;

  @Column({ name: 'device_id', nullable: true })
  deviceId?: string;

  @ManyToOne(() => Device, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'device_id' })
  device?: Device;

  @Column()
  version: string;

  @Column({ name: 'released_at', type: 'timestamptz', nullable: true })
  releasedAt?: Date;

  @Column({ nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
