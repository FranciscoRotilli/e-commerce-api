import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../../generated/prisma';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { Prisma } from 'generated/prisma';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { paginate } from 'src/common/utils/paginator';
import { SearchUsersDto } from './dto/search-users.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateUserDto) {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);
    const userCount = await this.prisma.user.count();
    const role = userCount === 0 ? UserRole.ADMIN : UserRole.USER;
    try {
      const user = await this.prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          password: hashedPassword,
          role: role,
        },
      });
      const { password: _password, ...safeUser } = user;
      return safeUser;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already registered.');
      }
      throw error;
    }
  }

  async updateProfile(userId: string, data: UpdateUserProfileDto) {
    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: data,
      });
      const { password: _password, ...safeUser } = updatedUser;
      return safeUser;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(`CPF already in use by another account.`);
      }
      throw error;
    }
  }

  async updateUserRole(id: string, data: UpdateUserRoleDto) {
    try {
      await this.prisma.user.update({
        where: { id },
        data: data,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`User with ID "${id}" not found.`);
      }
      throw error;
    }
  }

  async findAll(filters: SearchUsersDto) {
    const { page, limit, search, role, sortBy, sortOrder } = filters;
    const whereClause: Prisma.UserWhereInput = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { cpf: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      whereClause.role = role;
    }

    const orderByClause: Prisma.UserOrderByWithRelationInput = {};
    const allowedSortBy = ['name', 'email', 'createdAt'];

    if (sortBy && allowedSortBy.includes(sortBy)) {
      orderByClause[sortBy] = sortOrder ?? 'desc';
    } else {
      orderByClause.createdAt = 'desc';
    }

    const paginatedResult = await paginate(
      this.prisma.user,
      { page, limit },
      {
        where: whereClause,
        orderBy: orderByClause,
      },
    );

    return {
      ...paginatedResult,
      data: paginatedResult.data.map(
        ({ password: _password, ...user }) => user,
      ),
    };
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found.`);
    }
    const { password: _password, ...safeUser } = user;
    return safeUser;
  }

  // Internal Only
  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      throw new NotFoundException(`User with email "${email}" not found.`);
    }
    return user;
  }
}
