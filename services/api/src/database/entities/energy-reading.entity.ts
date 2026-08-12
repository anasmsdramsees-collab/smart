import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Device } from './device.entity';

@Entity('energy_readings')
@Index(['deviceId', 'readingAt'])
export class EnergyReading {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'device_id' })
  deviceId: string;

  @ManyToOne(() => Device, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'device_id' })
  device: Device;

  @Column({ name: 'watt_hours', type: 'numeric' })
  wattHours: number;

  @Column({ name: 'reading_at', type: 'timestamptz' })
  readingAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
