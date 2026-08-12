import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Membership, Organization, Role, User } from '../database/entities';
import { InviteMemberDto } from './dto/invite-member.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Organization) private readonly organizations: Repository<Organization>,
    @InjectRepository(Membership) private readonly memberships: Repository<Membership>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    private readonly auditService: AuditService,
  ) {}

  async listForUser(userId: string): Promise<Organization[]> {
    const memberships = await this.memberships.find({ where: { userId }, relations: { organization: true } });
    return memberships.map((m) => m.organization);
  }

  async getById(organizationId: string): Promise<Organization> {
    const organization = await this.organizations.findOne({ where: { id: organizationId } });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    return organization;
  }

  async listMembers(organizationId: string): Promise<Membership[]> {
    return this.memberships.find({
      where: { organizationId },
      relations: { user: true, role: true },
    });
  }

  async inviteMember(organizationId: string, actorUserId: string, dto: InviteMemberDto): Promise<Membership> {
    const user = await this.users.findOne({ where: { email: dto.email } });
    if (!user) {
      throw new NotFoundException('No SYLTRA account exists for this email yet; ask them to register first');
    }

    const existing = await this.memberships.findOne({ where: { organizationId, userId: user.id } });
    if (existing) {
      throw new ConflictException('This user is already a member of the organization');
    }

    const role = await this.roles.findOneOrFail({ where: { name: dto.role } });
    const membership = await this.memberships.save(
      this.memberships.create({ organizationId, userId: user.id, roleId: role.id }),
    );

    await this.auditService.record({
      organizationId,
      actorUserId,
      action: 'membership.invited',
      targetType: 'user',
      targetId: user.id,
      metadata: { role: dto.role },
    });

    return membership;
  }
}
