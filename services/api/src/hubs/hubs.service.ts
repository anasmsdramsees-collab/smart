import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Hub, HubStatus } from '../database/entities';
import { SyltraConfig } from '../config/configuration';
import { CreateHubDto } from './dto/create-hub.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class HubsService {
  constructor(
    @InjectRepository(Hub) private readonly hubs: Repository<Hub>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<SyltraConfig, true>,
    private readonly auditService: AuditService,
  ) {}

  list(organizationId: string): Promise<Hub[]> {
    return this.hubs.find({ where: { organizationId } });
  }

  async getOne(organizationId: string, hubId: string): Promise<Hub> {
    const hub = await this.hubs.findOne({ where: { id: hubId, organizationId } });
    if (!hub) {
      throw new NotFoundException('Hub not found');
    }
    return hub;
  }

  // Returns the created hub plus a one-time pairing token for the installer to hand
  // to the SYLTRA Edge Agent (see section 37, "Installer scans QR").
  async register(
    organizationId: string,
    actorUserId: string,
    dto: CreateHubDto,
  ): Promise<{ hub: Hub; pairingToken: string }> {
    const hub = await this.hubs.save(
      this.hubs.create({
        organizationId,
        propertyId: dto.propertyId,
        name: dto.name,
        serialNumber: this.generateSerialNumber(),
        status: HubStatus.PENDING,
      }),
    );

    const pairingToken = this.jwtService.sign(
      { sub: hub.id, type: 'hub' },
      { secret: this.configService.get('auth', { infer: true }).accessTokenSecret, expiresIn: '365d' },
    );

    await this.auditService.record({
      organizationId,
      actorUserId,
      action: 'hub.registered',
      targetType: 'hub',
      targetId: hub.id,
    });

    return { hub, pairingToken };
  }

  async recordHeartbeat(hubId: string, requestedHubId: string): Promise<Hub> {
    if (hubId !== requestedHubId) {
      throw new ForbiddenException('Hub token does not match the requested hub');
    }
    const hub = await this.hubs.findOne({ where: { id: hubId } });
    if (!hub) {
      throw new NotFoundException('Hub not found');
    }
    hub.status = HubStatus.ONLINE;
    hub.lastSeenAt = new Date();
    return this.hubs.save(hub);
  }

  private generateSerialNumber(): string {
    return `HUB-${randomBytes(4).toString('hex').toUpperCase()}`;
  }
}
