import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtPayload } from '../interfaces/jwtPayload.interface';
import { RequestWithAuthUser } from '../../common/interfaces/request-with-user.interface';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithAuthUser>();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      if (!this.validatePayload(payload)) {
        throw new UnauthorizedException('Invalid token payload');
      }

      request.user = payload;
    } catch (error) {
      if (
        error instanceof UnauthorizedException &&
        error.message === 'Invalid token payload'
      ) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token');
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private validatePayload(payload: unknown): payload is JwtPayload {
    return (
      payload !== null &&
      typeof payload === 'object' &&
      'sub' in payload &&
      'email' in payload &&
      'role' in payload &&
      typeof (payload as Record<string, unknown>).sub === 'string' &&
      typeof (payload as Record<string, unknown>).email === 'string' &&
      typeof (payload as Record<string, unknown>).role === 'string'
    );
  }
}
