import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExtractJwt } from 'passport-jwt';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // Allow SSE endpoints to pass token as ?token= query param
  // because browser EventSource cannot set Authorization headers
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const qToken = req.query?.token;
    if (qToken && !req.headers.authorization) {
      req.headers.authorization = `Bearer ${qToken}`;
    }
    return super.canActivate(context);
  }
}
