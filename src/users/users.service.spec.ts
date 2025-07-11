/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../../generated/prisma';
import { Prisma } from '../../generated/prisma';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { SearchUsersDto } from './dto/search-users.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { paginate } from 'src/common/utils/paginator';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Mock paginate function
jest.mock('src/common/utils/paginator', () => ({
  paginate: jest.fn(),
}));

const mockPrismaService = () => ({
  user: {
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  },
});

const mockPaginate = paginate as jest.MockedFunction<typeof paginate>;

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useFactory: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get(PrismaService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    };

    const mockUser = {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      password: 'hashedPassword',
      role: UserRole.USER,
      cpf: null,
      phone: null,
      birthDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      passwordResetToken: null,
      passwordResetExpires: null,
    };

    it('should create a new user with USER role when users exist', async () => {
      const hashedPassword = 'hashedPassword';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      prismaService.user.count.mockResolvedValue(1);
      prismaService.user.create.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(prismaService.user.count).toHaveBeenCalled();
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          name: 'John Doe',
          email: 'john@example.com',
          password: hashedPassword,
          role: UserRole.USER,
        },
      });
      expect(result).toEqual({
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        role: UserRole.USER,
        cpf: null,
        phone: null,
        birthDate: null,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
        passwordResetToken: null,
        passwordResetExpires: null,
      });
    });

    it('should create a new user with ADMIN role when no users exist', async () => {
      const hashedPassword = 'hashedPassword';
      const adminUser = { ...mockUser, role: UserRole.ADMIN };

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      prismaService.user.count.mockResolvedValue(0);
      prismaService.user.create.mockResolvedValue(adminUser);

      const result = await service.create(createUserDto);

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          name: 'John Doe',
          email: 'john@example.com',
          password: hashedPassword,
          role: UserRole.ADMIN,
        },
      });
      expect(result.role).toBe(UserRole.ADMIN);
    });

    it('should throw ConflictException when email already exists', async () => {
      const hashedPassword = 'hashedPassword';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      prismaService.user.count.mockResolvedValue(1);

      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
        },
      );
      prismaService.user.create.mockRejectedValue(prismaError);

      await expect(service.create(createUserDto)).rejects.toThrow(
        new ConflictException('Email already registered.'),
      );
    });

    it('should rethrow unknown errors', async () => {
      const hashedPassword = 'hashedPassword';
      const unknownError = new Error('Unknown error');

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      prismaService.user.count.mockResolvedValue(1);
      prismaService.user.create.mockRejectedValue(unknownError);

      await expect(service.create(createUserDto)).rejects.toThrow(unknownError);
    });
  });

  describe('updateProfile', () => {
    const userId = '1';
    const updateUserProfileDto: UpdateUserProfileDto = {
      name: 'Jane Doe',
      cpf: '12345678901',
    };

    const mockUpdatedUser = {
      id: '1',
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'hashedPassword',
      role: UserRole.USER,
      cpf: '12345678901',
      phone: null,
      birthDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      passwordResetToken: null,
      passwordResetExpires: null,
    };

    it('should update user profile successfully', async () => {
      prismaService.user.update.mockResolvedValue(mockUpdatedUser);

      const result = await service.updateProfile(userId, updateUserProfileDto);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateUserProfileDto,
      });
      expect(result).toEqual({
        id: '1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: UserRole.USER,
        cpf: '12345678901',
        phone: null,
        birthDate: null,
        createdAt: mockUpdatedUser.createdAt,
        updatedAt: mockUpdatedUser.updatedAt,
        passwordResetToken: null,
        passwordResetExpires: null,
      });
    });

    it('should throw ConflictException when CPF already exists', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
        },
      );
      prismaService.user.update.mockRejectedValue(prismaError);

      await expect(
        service.updateProfile(userId, updateUserProfileDto),
      ).rejects.toThrow(
        new ConflictException('CPF already in use by another account.'),
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        {
          code: 'P2025',
          clientVersion: '5.0.0',
        },
      );
      prismaService.user.update.mockRejectedValue(prismaError);

      await expect(
        service.updateProfile(userId, updateUserProfileDto),
      ).rejects.toThrow(
        new NotFoundException(`User with ID "${userId}" not found.`),
      );
    });

    it('should rethrow unknown errors', async () => {
      const unknownError = new Error('Unknown error');
      prismaService.user.update.mockRejectedValue(unknownError);

      await expect(
        service.updateProfile(userId, updateUserProfileDto),
      ).rejects.toThrow(unknownError);
    });
  });

  describe('changePassword', () => {
    const userId = '1';
    const changePasswordDto: ChangePasswordDto = {
      oldPassword: 'oldPassword123',
      newPassword: 'newPassword123',
    };

    const mockUser = {
      id: '1',
      password: 'hashedOldPassword',
      email: 'user@example.com',
      name: 'User',
      role: UserRole.USER,
      cpf: null,
      phone: null,
      birthDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      passwordResetToken: null,
      passwordResetExpires: null,
    };

    it('should change password successfully', async () => {
      const newHashedPassword = 'hashedNewPassword';

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue(newHashedPassword);
      prismaService.user.update.mockResolvedValue({
        ...mockUser,
        password: newHashedPassword,
      });

      const result = await service.changePassword(userId, changePasswordDto);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'oldPassword123',
        'hashedOldPassword',
      );
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { password: newHashedPassword },
      });
      expect(result).toEqual({ message: 'Password updated successfully' });
    });

    it('should use the service salt rounds constant', async () => {
      const newHashedPassword = 'hashedNewPassword';

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue(newHashedPassword);
      prismaService.user.update.mockResolvedValue({
        ...mockUser,
        password: newHashedPassword,
      });

      await service.changePassword(userId, changePasswordDto);

      // Verify that the salt rounds used match the service constant (10)
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);
    });

    it('should throw NotFoundException when user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword(userId, changePasswordDto),
      ).rejects.toThrow(new NotFoundException('User not found.'));
    });

    it('should throw ForbiddenException when old password is incorrect', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword(userId, changePasswordDto),
      ).rejects.toThrow(
        new ForbiddenException('The old password is not correct.'),
      );
    });

    it('should handle bcrypt comparison errors gracefully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockRejectedValue(
        new Error('Bcrypt error'),
      );

      await expect(
        service.changePassword(userId, changePasswordDto),
      ).rejects.toThrow(new Error('Bcrypt error'));
    });
  });

  describe('updateUserRole', () => {
    const userId = '1';
    const updateUserRoleDto: UpdateUserRoleDto = {
      role: UserRole.ADMIN,
    };

    it('should update user role successfully', async () => {
      prismaService.user.update.mockResolvedValue({});

      await service.updateUserRole(userId, updateUserRoleDto);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateUserRoleDto,
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        {
          code: 'P2025',
          clientVersion: '5.0.0',
        },
      );
      prismaService.user.update.mockRejectedValue(prismaError);

      await expect(
        service.updateUserRole(userId, updateUserRoleDto),
      ).rejects.toThrow(
        new NotFoundException(`User with ID "${userId}" not found.`),
      );
    });
  });

  describe('findAll', () => {
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
        password: 'hashedPassword',
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

    it('should return paginated users with filters', async () => {
      mockPaginate.mockResolvedValue(mockPaginatedResult);

      const result = await service.findAll(searchUsersDto);

      expect(mockPaginate).toHaveBeenCalledWith(
        prismaService.user,
        { page: 1, limit: 10 },
        {
          where: {
            OR: [
              { name: { contains: 'john', mode: 'insensitive' } },
              { email: { contains: 'john', mode: 'insensitive' } },
              { cpf: { contains: 'john', mode: 'insensitive' } },
            ],
            role: UserRole.USER,
          },
          orderBy: { name: 'asc' },
        },
      );

      expect(result.data[0]).not.toHaveProperty('password');
      expect(result.total).toBe(mockPaginatedResult.total);
      expect(result.page).toBe(mockPaginatedResult.page);
      expect(result.pages).toBe(mockPaginatedResult.pages);
    });

    it('should use default sorting when sortBy is invalid', async () => {
      const searchDtoWithInvalidSort = {
        ...searchUsersDto,
        sortBy: 'invalidField',
      };

      mockPaginate.mockResolvedValue(mockPaginatedResult);

      await service.findAll(searchDtoWithInvalidSort);

      expect(mockPaginate).toHaveBeenCalledWith(
        prismaService.user,
        { page: 1, limit: 10 },
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should work without search and role filters', async () => {
      const minimalSearchDto: SearchUsersDto = {
        page: 1,
        limit: 10,
      };

      mockPaginate.mockResolvedValue(mockPaginatedResult);

      await service.findAll(minimalSearchDto);

      expect(mockPaginate).toHaveBeenCalledWith(
        prismaService.user,
        { page: 1, limit: 10 },
        {
          where: {},
          orderBy: { createdAt: 'desc' },
        },
      );
    });
  });

  describe('findById', () => {
    const userId = '1';
    const mockUser = {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      password: 'hashedPassword',
      role: UserRole.USER,
      cpf: null,
      phone: null,
      birthDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      passwordResetToken: null,
      passwordResetExpires: null,
    };

    it('should return user by id without password', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById(userId);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(result).not.toHaveProperty('password');
      expect(result.id).toBe(userId);
    });

    it('should throw NotFoundException when user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findById(userId)).rejects.toThrow(
        new NotFoundException(`User with ID "${userId}" not found.`),
      );
    });
  });

  describe('findByEmail', () => {
    const email = 'john@example.com';
    const mockUser = {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      password: 'hashedPassword',
      role: UserRole.USER,
      cpf: null,
      phone: null,
      birthDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      passwordResetToken: null,
      passwordResetExpires: null,
    };

    it('should return user by email with password (internal use)', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail(email);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
      expect(result).toEqual(mockUser);
      expect(result).toHaveProperty('password');
    });

    it('should throw NotFoundException when user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findByEmail(email)).rejects.toThrow(
        new NotFoundException(`User with email "${email}" not found.`),
      );
    });
  });

  describe('update', () => {
    const userId = '1';
    const token = 'resetToken';
    const expires = new Date();

    it('should update user password reset fields successfully', async () => {
      prismaService.user.update.mockResolvedValue({});

      const result = await service.update(userId, token, expires);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          passwordResetToken: token,
          passwordResetExpires: expires,
        },
      });
      expect(result).toBe(true);
    });

    it('should throw NotFoundException when user not found', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        {
          code: 'P2025',
          clientVersion: '5.0.0',
        },
      );
      prismaService.user.update.mockRejectedValue(prismaError);

      await expect(service.update(userId, token, expires)).rejects.toThrow(
        new NotFoundException(`User with ID "${userId}" not found.`),
      );
    });
  });
});
