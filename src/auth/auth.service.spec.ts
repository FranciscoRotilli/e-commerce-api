/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UserRole } from 'generated/prisma';
import { ResetPasswordDto } from './dto/reset-password.dto';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Mock crypto
jest.mock('crypto');
const mockedCrypto = crypto as jest.Mocked<typeof crypto>;

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    emailVerified: null,
    password: 'hashedPassword123',
    passwordResetToken: null,
    passwordResetExpires: null,
    role: UserRole.USER,
    cpf: null,
    phone: null,
    birthDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSafeUser = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    emailVerified: null,
    role: UserRole.USER,
    cpf: null,
    phone: null,
    birthDate: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findFirst: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    prismaService = module.get(PrismaService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user without password when credentials are valid', async () => {
      // Arrange
      usersService.findByEmail.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);

      // Act
      const result = await service.validateUser(
        'john@example.com',
        'password123',
      );

      // Assert
      expect(usersService.findByEmail).toHaveBeenCalledWith('john@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'password123',
        mockUser.password,
      );
      expect(result).toEqual(mockSafeUser);
      expect(result).not.toHaveProperty('password');
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      // Arrange
      usersService.findByEmail.mockRejectedValue(new Error('User not found'));

      // Act & Assert
      await expect(
        service.validateUser('notfound@example.com', 'password123'),
      ).rejects.toThrow('User not found');
      expect(usersService.findByEmail).toHaveBeenCalledWith(
        'notfound@example.com',
      );
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      // Arrange
      usersService.findByEmail.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      // Act & Assert
      await expect(
        service.validateUser('john@example.com', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
      expect(usersService.findByEmail).toHaveBeenCalledWith('john@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'wrongpassword',
        mockUser.password,
      );
    });

    it('should throw bcrypt error when password comparison fails due to bcrypt error', async () => {
      // Arrange
      usersService.findByEmail.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockRejectedValue(
        new Error('Bcrypt error') as never,
      );

      // Act & Assert
      await expect(
        service.validateUser('john@example.com', 'password123'),
      ).rejects.toThrow('Bcrypt error');
    });
  });

  describe('login', () => {
    it('should return access token for valid user', async () => {
      // Arrange
      const expectedToken = 'jwt.token.here';
      jwtService.signAsync.mockResolvedValue(expectedToken);

      // Act
      const result = await service.login(mockSafeUser);

      // Assert
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: mockSafeUser.id,
        email: mockSafeUser.email,
        role: mockSafeUser.role,
      });
      expect(result).toEqual({ access_token: expectedToken });
    });

    it('should handle JWT signing error', async () => {
      // Arrange
      jwtService.signAsync.mockRejectedValue(new Error('JWT error'));

      // Act & Assert
      await expect(service.login(mockSafeUser)).rejects.toThrow('JWT error');
    });
  });

  describe('getProfile', () => {
    it('should return user payload', () => {
      // Arrange
      const userPayload = {
        sub: '1',
        email: 'john@example.com',
        role: UserRole.USER,
      };

      // Act
      const result = service.getProfile(userPayload);

      // Assert
      expect(result).toEqual(userPayload);
    });
  });

  describe('forgotPassword', () => {
    beforeEach(() => {
      // Mock console.log to avoid cluttering test output
      jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return success message when user exists and token is generated', async () => {
      // Arrange
      const resetToken = 'randomToken123';
      const hashedToken = 'hashedToken123';
      const mockRandomBytes = { toString: jest.fn(() => resetToken) };
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn(() => hashedToken),
      };

      usersService.findByEmail.mockResolvedValue(mockUser);
      (mockedCrypto.randomBytes as jest.Mock).mockReturnValue(mockRandomBytes);
      (mockedCrypto.createHash as jest.Mock).mockReturnValue(mockHash);
      usersService.update.mockResolvedValue(true);

      // Act
      const result = await service.forgotPassword('john@example.com');

      // Assert
      expect(usersService.findByEmail).toHaveBeenCalledWith('john@example.com');
      expect(crypto.randomBytes).toHaveBeenCalledWith(32);
      expect(crypto.createHash).toHaveBeenCalledWith('sha256');
      expect(mockHash.update).toHaveBeenCalledWith(resetToken);
      expect(mockHash.digest).toHaveBeenCalledWith('hex');
      expect(usersService.update).toHaveBeenCalledWith(
        mockUser.id,
        hashedToken,
        expect.any(Date),
      );
      expect(result).toBe(
        'If an account is associated with this email, you should receive instructions to reset your password.',
      );
      expect(console.log).toHaveBeenCalledWith(
        `Use este token para resetar a senha: ${resetToken}`,
      );
    });

    it('should return success message when user does not exist', async () => {
      // Arrange
      usersService.findByEmail.mockRejectedValue(new Error('User not found'));

      // Act & Assert
      await expect(
        service.forgotPassword('notfound@example.com'),
      ).rejects.toThrow('User not found');
      expect(usersService.findByEmail).toHaveBeenCalledWith(
        'notfound@example.com',
      );
    });

    it('should handle token update failure gracefully', async () => {
      // Arrange
      const resetToken = 'randomToken123';
      const hashedToken = 'hashedToken123';
      const mockRandomBytes = { toString: jest.fn(() => resetToken) };
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn(() => hashedToken),
      };

      usersService.findByEmail.mockResolvedValue(mockUser);
      (mockedCrypto.randomBytes as jest.Mock).mockReturnValue(mockRandomBytes);
      (mockedCrypto.createHash as jest.Mock).mockReturnValue(mockHash);
      usersService.update.mockResolvedValue(false);

      // Act
      const result = await service.forgotPassword('john@example.com');

      // Assert
      expect(usersService.update).toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });

  describe('resetPassword', () => {
    const resetPasswordDto: ResetPasswordDto = {
      token: 'resetToken123',
      newPassword: 'newPassword123',
    };

    it('should reset password successfully with valid token', async () => {
      // Arrange
      const hashedToken = 'hashedResetToken123';
      const hashedNewPassword = 'hashedNewPassword123';
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn(() => hashedToken),
      };
      const futureDate = new Date(Date.now() + 600000); // 10 minutes from now
      const userWithValidToken = {
        ...mockUser,
        passwordResetToken: hashedToken,
        passwordResetExpires: futureDate,
      };

      (mockedCrypto.createHash as jest.Mock).mockReturnValue(mockHash);
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
        userWithValidToken,
      );
      mockedBcrypt.hash.mockResolvedValue(hashedNewPassword as never);
      (prismaService.user.update as jest.Mock).mockResolvedValue(
        userWithValidToken,
      );

      // Act
      const result = await service.resetPassword(resetPasswordDto);

      // Assert
      expect(crypto.createHash).toHaveBeenCalledWith('sha256');
      expect(mockHash.update).toHaveBeenCalledWith(resetPasswordDto.token);
      expect(mockHash.digest).toHaveBeenCalledWith('hex');
      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          passwordResetToken: hashedToken,
          passwordResetExpires: {
            gt: expect.any(Date) as Date,
          },
        },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(
        resetPasswordDto.newPassword,
        10,
      );
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userWithValidToken.id },
        data: {
          password: hashedNewPassword,
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      });
      expect(result).toEqual({
        message: 'Password has been reset successfully.',
      });
    });

    it('should throw BadRequestException when token is invalid', async () => {
      // Arrange
      const hashedToken = 'hashedResetToken123';
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn(() => hashedToken),
      };

      (mockedCrypto.createHash as jest.Mock).mockReturnValue(mockHash);
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          passwordResetToken: hashedToken,
          passwordResetExpires: {
            gt: expect.any(Date) as Date,
          },
        },
      });
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(prismaService.user.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when token is expired', async () => {
      // Arrange
      const hashedToken = 'hashedResetToken123';
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn(() => hashedToken),
      };

      (mockedCrypto.createHash as jest.Mock).mockReturnValue(mockHash);
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null); // Expired token returns null

      // Act & Assert
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
