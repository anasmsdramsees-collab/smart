import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { SyltraConfig } from '../../config/configuration';

export interface RequestWithHub extends Request {
  hub?: { id: string };
}

// Authenticates a SYLTRA Edge Agent using the pairing token issued at hub registration.
// Distinct from JwtAuthGuard (human users): a hub is a device identity, not a user.
@Injectable()
export class HubAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<SyltraConfig, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithHub>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing hub bearer token');
    }
    const token = header.slice('Bearer '.length);

    const auth = this.configService.get('auth', { infer: true });
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string; type: string }>(token, {
        secret: auth.accessTokenSecret,
      });
      if (payload.type !== 'hub') {
        throw new UnauthorizedException('Invalid token type');
      }
      request.hub = { id: payload.sub };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired hub token');
    }
  }
}
