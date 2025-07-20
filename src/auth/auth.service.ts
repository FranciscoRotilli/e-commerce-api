import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
import { User } from 'generated/prisma';
import { JwtPayload } from './interfaces/jwtPayload.interface';
import * as crypto from 'crypto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PrismaService } from 'src/prisma/prisma.service';

type SafeUser = Omit<User, 'password'>;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    if (user && (await bcrypt.compare(password, user.password))) {
      const { password: _password, ...result } = user;
      return result;
    }
    throw new UnauthorizedException('Invalid credentials');
  }

  async login(user: SafeUser) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return { access_token: await this.jwtService.signAsync(payload) };
  }

  getProfile(userPayload: JwtPayload) {
    return {
      sub: userPayload.sub,
      email: userPayload.email,
      role: userPayload.role,
    };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    const message =
      'If an account is associated with this email, you should receive instructions to reset your password.';
    if (!user) {
      return { message };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    const tenMinutes = 10 * 60 * 1000;
    const tokenExpires = new Date(Date.now() + tenMinutes);

    const tokenUpdated = await this.usersService.update(
      user.id,
      hashedToken,
      tokenExpires,
    );

    if (tokenUpdated) {
      console.log('----------------------------------------------------');
      console.log('EMAIL DE RECUPERAÇÃO DE SENHA (SIMULAÇÃO)');
      console.log(`Use este token para resetar a senha: ${resetToken}`);
      console.log('----------------------------------------------------');
      return { message };
    }
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Token is invalid or has expired.');
    }
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedNewPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return { message: 'Password has been reset successfully.' };
  }
}
