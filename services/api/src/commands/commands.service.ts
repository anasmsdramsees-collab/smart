import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { CommandStatus, Device, DeviceCommand } from '../database/entities';
import { MqttService } from '../mqtt/mqtt.service';
import { CommandMessage, EventMessage, MqttTopics, parseHubTopic } from '@syltra/mqtt-contracts';
import { SendCommandDto } from './dto/send-command.dto';

@Injectable()
export class CommandsService implements OnModuleInit {
  private readonly logger = new Logger(CommandsService.name);

  constructor(
    @InjectRepository(DeviceCommand) private readonly commands: Repository<DeviceCommand>,
    @InjectRepository(Device) private readonly devices: Repository<Device>,
    private readonly mqttService: MqttService,
  ) {}

  onModuleInit(): void {
    this.mqttService.on(MqttTopics.eventsWildcard, (topic, payload) => this.handleEventMessage(topic, payload));
  }

  async send(organizationId: string, deviceId: string, requestedBy: string, dto: SendCommandDto): Promise<DeviceCommand> {
    const device = await this.devices.findOne({ where: { id: deviceId, organizationId } });
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const command = await this.commands.save(
      this.commands.create({
        organizationId,
        deviceId,
        capability: dto.capability,
        action: dto.action,
        value: dto.value,
        status: CommandStatus.PENDING,
        requestedBy,
        correlationId: randomUUID(),
      }),
    );

    const message: CommandMessage = {
      command_id: command.id,
      device_id: device.id,
      device_external_ref: device.externalRef ?? '',
      capability: command.capability,
      action: command.action,
      value: command.value,
      correlation_id: command.correlationId,
    };
    this.mqttService.publish(MqttTopics.commands(organizationId, device.hubId), message);

    command.status = CommandStatus.SENT;
    return this.commands.save(command);
  }

  async getOne(organizationId: string, commandId: string): Promise<DeviceCommand> {
    const command = await this.commands.findOne({ where: { id: commandId, organizationId } });
    if (!command) {
      throw new NotFoundException('Command not found');
    }
    return command;
  }

  private async handleEventMessage(topic: string, payload: unknown): Promise<void> {
    const parsed = parseHubTopic(topic);
    if (!parsed || parsed.channel !== 'events') return;

    const body = payload as EventMessage;
    if (body.type !== 'CommandExecuted' && body.type !== 'CommandFailed') {
      return;
    }
    if (!body.correlation_id) return;

    const command = await this.commands.findOne({ where: { correlationId: body.correlation_id } });
    if (!command) {
      this.logger.warn(`Command result for unknown correlation_id ${body.correlation_id}`);
      return;
    }

    command.status = body.type === 'CommandExecuted' ? CommandStatus.SUCCEEDED : CommandStatus.FAILED;
    await this.commands.save(command);
  }
}
