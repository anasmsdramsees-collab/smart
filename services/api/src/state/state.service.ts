import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device, DeviceEvent, DeviceEventType, DeviceState, DeviceStatus } from '../database/entities';
import { MqttService } from '../mqtt/mqtt.service';
import { MqttTopics, parseHubTopic, StateMessage } from '@syltra/mqtt-contracts';

@Injectable()
export class StateService implements OnModuleInit {
  private readonly logger = new Logger(StateService.name);

  constructor(
    @InjectRepository(DeviceState) private readonly states: Repository<DeviceState>,
    @InjectRepository(Device) private readonly devices: Repository<Device>,
    @InjectRepository(DeviceEvent) private readonly events: Repository<DeviceEvent>,
    private readonly mqttService: MqttService,
  ) {}

  onModuleInit(): void {
    this.mqttService.on(MqttTopics.stateWildcard, (topic, payload) => this.handleStateMessage(topic, payload));
  }

  private async handleStateMessage(topic: string, payload: unknown): Promise<void> {
    const parsed = parseHubTopic(topic);
    if (!parsed) return;

    const body = payload as StateMessage;
    const device = await this.devices.findOne({ where: { hubId: parsed.hubId, externalRef: body.device_external_ref } });
    if (!device) {
      this.logger.warn(`State update for unknown device ${body.device_external_ref} on hub ${parsed.hubId}`);
      return;
    }

    await this.states.save(
      this.states.create({
        deviceId: device.id,
        capability: body.capability,
        value: body.value,
        unit: body.unit,
        source: 'home_assistant',
        quality: body.quality ?? 'valid',
        observedAt: new Date(),
      }),
    );

    if (device.status !== DeviceStatus.ONLINE) {
      device.status = DeviceStatus.ONLINE;
      await this.devices.save(device);
    }

    await this.events.save(
      this.events.create({
        organizationId: device.organizationId,
        deviceId: device.id,
        type: DeviceEventType.STATE_CHANGED,
        payload: { capability: body.capability, value: body.value },
      }),
    );
  }

  async getLatest(organizationId: string, deviceId: string): Promise<DeviceState[]> {
    await this.assertDeviceInOrg(organizationId, deviceId);
    const capabilities = await this.states
      .createQueryBuilder('state')
      .distinctOn(['state.capability'])
      .where('state.deviceId = :deviceId', { deviceId })
      .orderBy('state.capability')
      .addOrderBy('state.observedAt', 'DESC')
      .getMany();
    return capabilities;
  }

  async getHistory(organizationId: string, deviceId: string, capability: string, limit = 100): Promise<DeviceState[]> {
    await this.assertDeviceInOrg(organizationId, deviceId);
    return this.states.find({
      where: { deviceId, capability },
      order: { observedAt: 'DESC' },
      take: limit,
    });
  }

  private async assertDeviceInOrg(organizationId: string, deviceId: string): Promise<void> {
    const device = await this.devices.findOne({ where: { id: deviceId, organizationId } });
    if (!device) {
      throw new NotFoundException('Device not found');
    }
  }
}
