import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum RoleName {
  OWNER = 'owner',
  ADMIN = 'admin',
  INSTALLER = 'installer',
  RESIDENT = 'resident',
  GUEST = 'guest',
  DEVELOPER = 'developer',
  SERVICE = 'service',
}

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: RoleName;
}
