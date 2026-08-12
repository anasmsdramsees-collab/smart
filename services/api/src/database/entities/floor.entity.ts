import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Building } from './building.entity';

@Entity('floors')
export class Floor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'building_id' })
  buildingId: string;

  @ManyToOne(() => Building, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'building_id' })
  building: Building;

  @Column()
  name: string;

  @Column({ default: 0 })
  level: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
