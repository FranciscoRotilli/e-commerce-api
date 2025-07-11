/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserRole } from '../../generated/prisma';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { SearchUsersDto } from './dto/search-users.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtPayload } from 'src/auth/interfaces/jwtPayload.interface';

const mockUsersService = () => ({
  create: jest.fn(),
  updateProfile: jest.fn(),
  changePassword: jest.fn(),
  updateUserRole: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
});

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useFactory: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    };

    const mockCreatedUser = {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      role: UserRole.USER,
      cpf: null,
      phone: null,
      birthDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      passwordResetToken: null,
      passwordResetExpires: null,
    };

    it('should create a new user', async () => {
      usersService.create.mockResolvedValue(mockCreatedUser);

      const result = await controller.create(createUserDto);

      expect(usersService.create).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(mockCreatedUser);
    });

    it('should pass through service errors', async () => {
      const error = new Error('Email already exists');
      usersService.create.mockRejectedValue(error);

      await expect(controller.create(createUserDto)).rejects.toThrow(error);
    });
  });

  describe('updateProfile', () => {
    const mockUser: JwtPayload = {
      sub: '1',
      email: 'john@example.com',
      role: UserRole.USER,
    };

    const updateUserProfileDto: UpdateUserProfileDto = {
      name: 'Jane Doe',
      cpf: '12345678901',
    };

    const mockUpdatedUser = {
      id: '1',
      name: 'Jane Doe',
      email: 'john@example.com',
      role: UserRole.USER,
      cpf: '12345678901',
      phone: null,
      birthDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      passwordResetToken: null,
      passwordResetExpires: null,
    };

    it('should update user profile', async () => {
      usersService.updateProfile.mockResolvedValue(mockUpdatedUser);

      const result = await controller.updateProfile(
        mockUser,
        updateUserProfileDto,
      );

      expect(usersService.updateProfile).toHaveBeenCalledWith(
        mockUser.sub,
        updateUserProfileDto,
      );
      expect(result).toEqual(mockUpdatedUser);
    });

    it('should pass through service errors', async () => {
      const error = new Error('CPF already in use');
      usersService.updateProfile.mockRejectedValue(error);

      await expect(
        controller.updateProfile(mockUser, updateUserProfileDto),
      ).rejects.toThrow(error);
    });
  });

  describe('changeMyPassword', () => {
    const mockUser: JwtPayload = {
      sub: '1',
      email: 'john@example.com',
      role: UserRole.USER,
    };

    const changePasswordDto: ChangePasswordDto = {
      oldPassword: 'oldPassword123',
      newPassword: 'newPassword123',
    };

    const mockPasswordChangeResponse = {
      message: 'Password updated successfully',
    };

    it('should change user password', async () => {
      usersService.changePassword.mockResolvedValue(mockPasswordChangeResponse);

      const result = await controller.changeMyPassword(
        mockUser,
        changePasswordDto,
      );

      expect(usersService.changePassword).toHaveBeenCalledWith(
        mockUser.sub,
        changePasswordDto,
      );
      expect(result).toEqual(mockPasswordChangeResponse);
    });

    it('should pass through service errors', async () => {
      const error = new Error('Old password is incorrect');
      usersService.changePassword.mockRejectedValue(error);

      await expect(
        controller.changeMyPassword(mockUser, changePasswordDto),
      ).rejects.toThrow(error);
    });
  });

  describe('updateUserRole (Admin only)', () => {
    const userId = '1';
    const updateUserRoleDto: UpdateUserRoleDto = {
      role: UserRole.ADMIN,
    };

    it('should update user role', async () => {
      usersService.updateUserRole.mockResolvedValue(undefined);

      const result = await controller.updateUserRole(userId, updateUserRoleDto);

      expect(usersService.updateUserRole).toHaveBeenCalledWith(
        userId,
        updateUserRoleDto,
      );
      expect(result).toBeUndefined();
    });

    it('should pass through service errors', async () => {
      const error = new Error('User not found');
      usersService.updateUserRole.mockRejectedValue(error);

      await expect(
        controller.updateUserRole(userId, updateUserRoleDto),
      ).rejects.toThrow(error);
    });
  });

  describe('findAll (Admin only)', () => {
    const searchUsersDto: SearchUsersDto = {
      page: 1,
      limit: 10,
      search: 'john',
      role: UserRole.USER,
      sortBy: 'name',
      sortOrder: 'asc',
    };

    const mockUsers = [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        role: UserRole.USER,
        cpf: null,
        phone: null,
        birthDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    ];

    const mockPaginatedResult = {
      data: mockUsers,
      total: 1,
      page: 1,
      limit: 10,
      pages: 1,
    };

    it('should return paginated users', async () => {
      usersService.findAll.mockResolvedValue(mockPaginatedResult);

      const result = await controller.findAll(searchUsersDto);

      expect(usersService.findAll).toHaveBeenCalledWith(searchUsersDto);
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should work with minimal search parameters', async () => {
      const minimalSearchDto: SearchUsersDto = {
        page: 1,
        limit: 10,
      };

      usersService.findAll.mockResolvedValue(mockPaginatedResult);

      const result = await controller.findAll(minimalSearchDto);

      expect(usersService.findAll).toHaveBeenCalledWith(minimalSearchDto);
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should pass through service errors', async () => {
      const error = new Error('Database error');
      usersService.findAll.mockRejectedValue(error);

      await expect(controller.findAll(searchUsersDto)).rejects.toThrow(error);
    });
  });

  describe('findById (Admin only)', () => {
    const userId = '1';
    const mockUser = {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      role: UserRole.USER,
      cpf: null,
      phone: null,
      birthDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      passwordResetToken: null,
      passwordResetExpires: null,
    };

    it('should return user by id', async () => {
      usersService.findById.mockResolvedValue(mockUser);

      const result = await controller.findById(userId);

      expect(usersService.findById).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockUser);
    });

    it('should pass through service errors', async () => {
      const error = new Error('User not found');
      usersService.findById.mockRejectedValue(error);

      await expect(controller.findById(userId)).rejects.toThrow(error);
    });
  });

  describe('Metadata validation', () => {
    it('should have correct controller path', () => {
      const controllerMetadata = Reflect.getMetadata('path', UsersController);
      expect(controllerMetadata).toBe('users');
    });

    it('should validate route methods exist', () => {
      expect(typeof controller.create).toBe('function');
      expect(typeof controller.updateProfile).toBe('function');
      expect(typeof controller.changeMyPassword).toBe('function');
      expect(typeof controller.updateUserRole).toBe('function');
      expect(typeof controller.findAll).toBe('function');
      expect(typeof controller.findById).toBe('function');
    });
  });

  describe('Input validation', () => {
    it('should accept valid CreateUserDto', async () => {
      const validDto: CreateUserDto = {
        name: 'Valid Name',
        email: 'valid@example.com',
        password: 'validPassword123',
      };

      usersService.create.mockResolvedValue({});

      await controller.create(validDto);

      expect(usersService.create).toHaveBeenCalledWith(validDto);
    });

    it('should accept valid UpdateUserProfileDto', async () => {
      const mockUser: JwtPayload = {
        sub: '1',
        email: 'user@example.com',
        role: UserRole.USER,
      };

      const validDto: UpdateUserProfileDto = {
        name: 'Updated Name',
        cpf: '12345678901',
      };

      usersService.updateProfile.mockResolvedValue({});

      await controller.updateProfile(mockUser, validDto);

      expect(usersService.updateProfile).toHaveBeenCalledWith(
        mockUser.sub,
        validDto,
      );
    });

    it('should accept valid ChangePasswordDto', async () => {
      const mockUser: JwtPayload = {
        sub: '1',
        email: 'user@example.com',
        role: UserRole.USER,
      };

      const validDto: ChangePasswordDto = {
        oldPassword: 'oldPassword123',
        newPassword: 'newPassword123',
      };

      usersService.changePassword.mockResolvedValue({});

      await controller.changeMyPassword(mockUser, validDto);

      expect(usersService.changePassword).toHaveBeenCalledWith(
        mockUser.sub,
        validDto,
      );
    });
  });

  describe('HTTP Status Codes', () => {
    it('should use correct HTTP status for create endpoint', () => {
      const createMetadata = Reflect.getMetadata(
        '__httpCode__',
        // eslint-disable-next-line @typescript-eslint/unbound-method
        controller.create,
      );
      expect(createMetadata).toBe(201); // HttpStatus.CREATED
    });

    it('should use correct HTTP status for changeMyPassword endpoint', () => {
      const passwordMetadata = Reflect.getMetadata(
        '__httpCode__',
        // eslint-disable-next-line @typescript-eslint/unbound-method
        controller.changeMyPassword,
      );
      expect(passwordMetadata).toBe(200); // HttpStatus.OK
    });

    it('should use correct HTTP status for updateUserRole endpoint', () => {
      const roleMetadata = Reflect.getMetadata(
        '__httpCode__',
        // eslint-disable-next-line @typescript-eslint/unbound-method
        controller.updateUserRole,
      );
      expect(roleMetadata).toBe(204); // HttpStatus.NO_CONTENT
    });
  });

  describe('Role-based Access Control', () => {
    it('should require ADMIN and USER roles for updateProfile', () => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const roles = Reflect.getMetadata('roles', controller.updateProfile);
      expect(roles).toEqual([UserRole.ADMIN, UserRole.USER]);
    });

    it('should require ADMIN and USER roles for changeMyPassword', () => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const roles = Reflect.getMetadata('roles', controller.changeMyPassword);
      expect(roles).toEqual([UserRole.ADMIN, UserRole.USER]);
    });

    it('should require only ADMIN role for updateUserRole', () => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const roles = Reflect.getMetadata('roles', controller.updateUserRole);
      expect(roles).toEqual([UserRole.ADMIN]);
    });

    it('should require only ADMIN role for findAll', () => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const roles = Reflect.getMetadata('roles', controller.findAll);
      expect(roles).toEqual([UserRole.ADMIN]);
    });

    it('should require only ADMIN role for findById', () => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const roles = Reflect.getMetadata('roles', controller.findById);
      expect(roles).toEqual([UserRole.ADMIN]);
    });
  });
});
