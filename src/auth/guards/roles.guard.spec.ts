import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from 'generated/prisma';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const mockUser = {
    id: 'user1',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.USER,
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAdminUser = {
    id: 'admin1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: UserRole.ADMIN,
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createMockExecutionContext = (
    user?: unknown,
    requiredRoles?: UserRole[] | null,
  ): ExecutionContext => {
    const mockRequest = {
      user,
    };

    const mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    if (requiredRoles !== undefined) {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);
    }

    return mockContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true when no roles are required', () => {
      const getAllAndOverrideSpy = jest.spyOn(reflector, 'getAllAndOverride');
      const context = createMockExecutionContext(mockUser, null);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(getAllAndOverrideSpy).toHaveBeenCalledWith(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should return true when empty roles array is provided', () => {
      const context = createMockExecutionContext(mockUser, []);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException when user is not present in request', () => {
      const context = createMockExecutionContext(null, [UserRole.USER]);

      expect(() => guard.canActivate(context)).toThrow(
        'User not authenticated',
      );
    });

    it('should throw UnauthorizedException when user is undefined', () => {
      const context = createMockExecutionContext(undefined, [UserRole.USER]);

      expect(() => guard.canActivate(context)).toThrow(
        'User not authenticated',
      );
    });

    it('should return true when user has the required role (USER)', () => {
      const context = createMockExecutionContext(mockUser, [UserRole.USER]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user has the required role (ADMIN)', () => {
      const context = createMockExecutionContext(mockAdminUser, [
        UserRole.ADMIN,
      ]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user does not have the required role', () => {
      const context = createMockExecutionContext(mockUser, [UserRole.ADMIN]);

      expect(() => guard.canActivate(context)).toThrow(
        'Insufficient permissions',
      );
    });

    it('should return true when user has one of multiple required roles', () => {
      const context = createMockExecutionContext(mockUser, [
        UserRole.USER,
        UserRole.ADMIN,
      ]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when admin user has one of multiple required roles', () => {
      const context = createMockExecutionContext(mockAdminUser, [
        UserRole.USER,
        UserRole.ADMIN,
      ]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user does not have any of the required roles', () => {
      const userWithNoMatchingRole = {
        ...mockUser,
        role: UserRole.USER,
      };
      const context = createMockExecutionContext(userWithNoMatchingRole, [
        UserRole.ADMIN,
      ]);

      expect(() => guard.canActivate(context)).toThrow(
        'Insufficient permissions',
      );
    });

    it('should call reflector.getAllAndOverride with correct parameters', () => {
      const getAllAndOverrideSpy = jest.spyOn(reflector, 'getAllAndOverride');
      const context = createMockExecutionContext(mockUser, [UserRole.USER]);

      guard.canActivate(context);

      expect(getAllAndOverrideSpy).toHaveBeenCalledWith(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should call context.switchToHttp().getRequest() to get the request object', () => {
      const context = createMockExecutionContext(mockUser, [UserRole.USER]);
      const switchToHttpSpy = jest.spyOn(context, 'switchToHttp');
      const getRequestSpy = jest.spyOn(context.switchToHttp(), 'getRequest');

      guard.canActivate(context);

      expect(switchToHttpSpy).toHaveBeenCalled();
      expect(getRequestSpy).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user object exists but role is undefined', () => {
      const userWithoutRole = {
        ...mockUser,
        role: undefined as unknown as UserRole,
      };
      const context = createMockExecutionContext(userWithoutRole, [
        UserRole.USER,
      ]);

      expect(() => guard.canActivate(context)).toThrow(
        'User not authenticated',
      );
    });

    it('should throw UnauthorizedException when user object exists but role is null', () => {
      const userWithNullRole = {
        ...mockUser,
        role: null as unknown as UserRole,
      };
      const context = createMockExecutionContext(userWithNullRole, [
        UserRole.USER,
      ]);

      expect(() => guard.canActivate(context)).toThrow(
        'User not authenticated',
      );
    });
  });
});
