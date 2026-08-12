import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser, RequestWithUser } from '../guards/jwt-auth.guard';

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthenticatedUser => {
  const request = ctx.switchToHttp().getRequest<RequestWithUser>();
  return request.user as AuthenticatedUser;
});
