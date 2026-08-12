import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Building } from './building.entity';
import { Floor } from './floor.entity';
import { Zone } from './zone.entity';

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'building_id' })
  @Index()
  buildingId: string;

  @ManyToOne(() => Building, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'building_id' })
  building: Building;

  @Column({ name: 'floor_id', nullable: true })
  floorId?: string;

  @ManyToOne(() => Floor, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'floor_id' })
  floor?: Floor;

  @Column({ name: 'zone_id', nullable: true })
  zoneId?: string;

  @ManyToOne(() => Zone, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'zone_id' })
  zone?: Zone;

  @Column()
  name: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
