import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Device, DeviceCapability, DeviceEvent, DeviceEventType, DeviceStatus, Hub, Room } from '../database/entities';
import { UpsertDeviceDto } from './dto/upsert-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device) private readonly devices: Repository<Device>,
    @InjectRepository(DeviceCapability) private readonly capabilities: Repository<DeviceCapability>,
    @InjectRepository(Hub) private readonly hubs: Repository<Hub>,
    @InjectRepository(DeviceEvent) private readonly events: Repository<DeviceEvent>,
    @InjectRepository(Room) private readonly rooms: Repository<Room>,
  ) {}

  list(organizationId: string): Promise<Device[]> {
    return this.devices.find({ where: { organizationId } });
  }

  async getOne(organizationId: string, deviceId: string): Promise<Device> {
    const device = await this.devices.findOne({ where: { id: deviceId, organizationId } });
    if (!device) {
      throw new NotFoundException('Device not found');
    }
    return device;
  }

  // Idempotent upsert keyed on (hub_id, external_ref) — re-running discovery never
  // creates a duplicate device (section 19).
  async upsertFromDiscovery(hubId: string, dto: UpsertDeviceDto): Promise<Device> {
    const hub = await this.hubs.findOneOrFail({ where: { id: hubId } });

    let device = await this.devices.findOne({ where: { hubId, externalRef: dto.externalRef } });
    const isNew = !device;

    if (!device) {
      device = this.devices.create({
        organizationId: hub.organizationId,
        hubId,
        deviceKey: this.generateDeviceKey(dto.type),
        externalRef: dto.externalRef,
        name: dto.name,
        type: dto.type,
        manufacturer: dto.manufacturer,
        model: dto.model,
        roomId: dto.roomId,
        status: DeviceStatus.ONLINE,
      });
    } else {
      device.name = dto.name;
      device.manufacturer = dto.manufacturer;
      device.model = dto.model;
      device.roomId = dto.roomId ?? device.roomId;
      device.status = DeviceStatus.ONLINE;
    }
    device = await this.devices.save(device);

    for (const capability of dto.capabilities) {
      const existing = await this.capabilities.findOne({
        where: { deviceId: device.id, capability: capability.capability },
      });
      if (existing) {
        existing.unit = capability.unit;
        await this.capabilities.save(existing);
      } else {
        await this.capabilities.save(
          this.capabilities.create({ deviceId: device.id, capability: capability.capability, unit: capability.unit }),
        );
      }
    }

    await this.events.save(
      this.events.create({
        organizationId: hub.organizationId,
        deviceId: device.id,
        type: isNew ? DeviceEventType.DEVICE_DISCOVERED : DeviceEventType.DEVICE_UPDATED,
        payload: { externalRef: dto.externalRef },
      }),
    );

    return device;
  }

  async update(organizationId: string, deviceId: string, dto: UpdateDeviceDto): Promise<Device> {
    const device = await this.getOne(organizationId, deviceId);

    if (dto.roomId !== undefined) {
      const room = await this.rooms
        .createQueryBuilder('room')
        .innerJoin('room.building', 'building')
        .innerJoin('building.property', 'property')
        .where('room.id = :roomId', { roomId: dto.roomId })
        .andWhere('property.organizationId = :organizationId', { organizationId })
        .getOne();
      if (!room) {
        throw new BadRequestException('Room not found in this organization');
      }
      device.roomId = dto.roomId;
    }

    if (dto.name !== undefined) {
      device.name = dto.name;
    }

    return this.devices.save(device);
  }

  async listCapabilities(organizationId: string, deviceId: string): Promise<DeviceCapability[]> {
    await this.getOne(organizationId, deviceId);
    return this.capabilities.find({ where: { deviceId } });
  }

  private generateDeviceKey(type: string): string {
    const prefix = type.toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 20);
    return `${prefix}-${randomBytes(3).toString('hex').toUpperCase()}`;
  }
}
