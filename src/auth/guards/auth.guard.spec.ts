/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from './auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UserRole } from 'generated/prisma';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtService: JwtService;
  let reflector: Reflector;

  const mockJwtPayload = {
    sub: 'user123',
    email: 'test@example.com',
    role: UserRole.USER,
  };

  const createMockExecutionContext = (
    isPublic = false,
    authorizationHeader?: string,
  ): ExecutionContext => {
    const mockRequest = {
      headers: {
        authorization: authorizationHeader,
      },
    };

    const mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(isPublic);

    return mockContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
    jwtService = module.get<JwtService>(JwtService);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true for public routes', async () => {
      const context = createMockExecutionContext(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      const getAllAndOverrideSpy = jest.spyOn(reflector, 'getAllAndOverride');
      expect(getAllAndOverrideSpy).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should throw UnauthorizedException when no token is provided', async () => {
      const context = createMockExecutionContext(false);

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('No token provided'),
      );
    });

    it('should throw UnauthorizedException when authorization header is malformed', async () => {
      const context = createMockExecutionContext(false, 'InvalidHeader');

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('No token provided'),
      );
    });

    it('should throw UnauthorizedException when token type is not Bearer', async () => {
      const context = createMockExecutionContext(false, 'Basic token123');

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('No token provided'),
      );
    });

    it('should return true when valid token is provided', async () => {
      const context = createMockExecutionContext(false, 'Bearer valid-token');
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(mockJwtPayload);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      const jwtServiceSpy = jest.spyOn(jwtService, 'verifyAsync');
      expect(jwtServiceSpy).toHaveBeenCalledWith('valid-token');
      expect((context.switchToHttp().getRequest() as any).user).toEqual(
        mockJwtPayload,
      );
    });

    it('should throw UnauthorizedException when JWT verification fails', async () => {
      const context = createMockExecutionContext(false, 'Bearer invalid-token');
      jest
        .spyOn(jwtService, 'verifyAsync')
        .mockRejectedValue(new Error('Invalid token'));

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Invalid token'),
      );
    });

    it('should throw UnauthorizedException when payload is invalid', async () => {
      const context = createMockExecutionContext(false, 'Bearer valid-token');
      const invalidPayload = { sub: 'user123' }; // Missing email and role
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(invalidPayload);

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Invalid token payload'),
      );
    });

    it('should handle non-Error exceptions during JWT verification', async () => {
      const context = createMockExecutionContext(false, 'Bearer invalid-token');
      jest
        .spyOn(jwtService, 'verifyAsync')
        .mockRejectedValue('String error message');

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Invalid token'),
      );
    });

    it('should validate payload structure correctly', async () => {
      const context = createMockExecutionContext(false, 'Bearer valid-token');
      const validPayload = {
        sub: 'user123',
        email: 'test@example.com',
        role: UserRole.ADMIN,
      };
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(validPayload);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});
