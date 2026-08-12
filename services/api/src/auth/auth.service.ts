import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { Organization, Role, RoleName, Membership, User } from '../database/entities';
import { SyltraConfig } from '../config/configuration';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuditService } from '../audit/audit.service';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface AccessTokenPayload {
  sub: string;
  email: string;
  type: 'access';
}

interface RefreshTokenPayload {
  sub: string;
  type: 'refresh';
}

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Organization) private readonly organizations: Repository<Organization>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(Membership) private readonly memberships: Repository<Membership>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<SyltraConfig, true>,
    private readonly auditService: AuditService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: Pick<User, 'id' | 'email'>; organizationId: string } & TokenPair> {
    const existing = await this.users.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.users.save(
      this.users.create({ email: dto.email, passwordHash, fullName: dto.fullName }),
    );

    const organization = await this.organizations.save(
      this.organizations.create({
        name: dto.organizationName,
        slug: this.slugify(dto.organizationName),
      }),
    );

    const ownerRole = await this.roles.findOneOrFail({ where: { name: RoleName.OWNER } });
    await this.memberships.save(
      this.memberships.create({ organizationId: organization.id, userId: user.id, roleId: ownerRole.id }),
    );

    await this.auditService.record({
      organizationId: organization.id,
      actorUserId: user.id,
      action: 'user.registered',
      targetType: 'user',
      targetId: user.id,
    });

    const tokens = this.issueTokens(user);
    return { user: { id: user.id, email: user.email }, organizationId: organization.id, ...tokens };
  }

  async login(dto: LoginDto): Promise<{ user: Pick<User, 'id' | 'email'> } & TokenPair> {
    const user = await this.users.findOne({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const matches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = this.issueTokens(user);
    return { user: { id: user.id, email: user.email }, ...tokens };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const auth = this.configService.get('auth', { infer: true });
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: auth.refreshTokenSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.users.findOne({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    return this.issueTokens(user);
  }

  private issueTokens(user: User): TokenPair {
    const auth = this.configService.get('auth', { infer: true });

    const accessPayload: AccessTokenPayload = { sub: user.id, email: user.email, type: 'access' };
    const refreshPayload: RefreshTokenPayload = { sub: user.id, type: 'refresh' };

    const accessToken = this.jwtService.sign(accessPayload, {
      secret: auth.accessTokenSecret,
      expiresIn: auth.accessTokenTtl as never,
    });
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: auth.refreshTokenSecret,
      expiresIn: auth.refreshTokenTtl as never,
    });

    return { accessToken, refreshToken };
  }

  private slugify(name: string): string {
    const base = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const suffix = randomBytes(3).toString('hex');
    return `${base || 'org'}-${suffix}`;
  }
}
