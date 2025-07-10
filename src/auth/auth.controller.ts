import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Roles } from './decorators/roles.decorator';
import { Request } from 'express';
import { Public } from './decorators/public.decorator';
import { JwtPayload } from './interfaces/jwtPayload.interface';
import { ForgotPasswordDto } from './dto/forgot-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const validatedUser = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    return this.authService.login(validatedUser);
  }

  @Roles('USER', 'ADMIN')
  @Get('profile')
  getProfile(@Req() request: Request) {
    return this.authService.getProfile(request.user as JwtPayload);
  }

  @Post('/forgot-password')
  @Roles('ADMIN', 'USER')
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }
}
