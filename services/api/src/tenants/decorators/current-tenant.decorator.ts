import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithTenant } from '../guards/tenant.guard';

export const CurrentTenant = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<RequestWithTenant>();
  return request.tenant;
});
