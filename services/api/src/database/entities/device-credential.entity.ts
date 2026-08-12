import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Device } from './device.entity';

// Stores only a pointer to a secret manager entry (secretRef), never a plaintext credential.
@Entity('device_credentials')
export class DeviceCredential {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'device_id' })
  deviceId: string;

  @ManyToOne(() => Device, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'device_id' })
  device: Device;

  @Column({ name: 'credential_type' })
  credentialType: string;

  @Column({ name: 'secret_ref' })
  secretRef: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
