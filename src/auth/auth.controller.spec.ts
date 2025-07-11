import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtPayload } from './interfaces/jwtPayload.interface';
import { UserRole } from 'generated/prisma';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    validateUser: jest.fn(),
    login: jest.fn(),
    getProfile: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: UserRole.USER,
        firstName: 'John',
        lastName: 'Doe',
      };
      const mockLoginResult = { access_token: 'jwt-token' };

      mockAuthService.validateUser.mockResolvedValue(mockUser);
      mockAuthService.login.mockResolvedValue(mockLoginResult);

      const result = await controller.login(loginDto);

      expect(mockAuthService.validateUser).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
      expect(mockAuthService.login).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockLoginResult);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'invalid@example.com',
        password: 'wrongpassword',
      };

      mockAuthService.validateUser.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      await expect(controller.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockAuthService.validateUser).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('should return user profile', () => {
      const userPayload: JwtPayload = {
        sub: '1',
        email: 'test@example.com',
        role: UserRole.USER,
      };

      mockAuthService.getProfile.mockReturnValue(userPayload);

      const result = controller.getProfile(userPayload);

      expect(mockAuthService.getProfile).toHaveBeenCalledWith(userPayload);
      expect(result).toEqual(userPayload);
    });
  });

  describe('forgotPassword', () => {
    it('should handle forgot password request successfully', async () => {
      const forgotPasswordDto: ForgotPasswordDto = {
        email: 'test@example.com',
      };
      const expectedMessage =
        'If an account is associated with this email, you should receive instructions to reset your password.';

      mockAuthService.forgotPassword.mockResolvedValue(expectedMessage);

      const result = await controller.forgotPassword(forgotPasswordDto);

      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith(
        forgotPasswordDto.email,
      );
      expect(result).toBe(expectedMessage);
    });

    it('should handle forgot password for non-existent email', async () => {
      const forgotPasswordDto: ForgotPasswordDto = {
        email: 'nonexistent@example.com',
      };
      const expectedMessage =
        'If an account is associated with this email, you should receive instructions to reset your password.';

      mockAuthService.forgotPassword.mockResolvedValue(expectedMessage);

      const result = await controller.forgotPassword(forgotPasswordDto);

      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith(
        forgotPasswordDto.email,
      );
      expect(result).toBe(expectedMessage);
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully with valid token', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        token: 'valid-reset-token',
        newPassword: 'newPassword123',
      };
      const expectedResponse = {
        message: 'Password has been reset successfully.',
      };

      mockAuthService.resetPassword.mockResolvedValue(expectedResponse);

      const result = await controller.resetPassword(resetPasswordDto);

      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(
        resetPasswordDto,
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should throw BadRequestException for invalid or expired token', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        token: 'invalid-token',
        newPassword: 'newPassword123',
      };

      mockAuthService.resetPassword.mockRejectedValue(
        new BadRequestException('Token is invalid or has expired.'),
      );

      await expect(controller.resetPassword(resetPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(
        resetPasswordDto,
      );
    });
  });
});
