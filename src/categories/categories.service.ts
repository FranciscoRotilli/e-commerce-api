import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from 'generated/prisma';
import { JwtPayload } from 'src/auth/interfaces/jwtPayload.interface';
import slugify from 'slugify';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { paginate } from 'src/common/utils/paginator';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const { name, slug } = createCategoryDto;

    const finalSlug =
      slug ??
      slugify(name, {
        lower: true,
        strict: true,
        remove: /[*+~.()'"!:@]/g,
      });

    try {
      return this.prisma.category.create({
        data: {
          name: name,
          slug: finalSlug,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const field = error.meta?.target?.[0] as string;
        throw new ConflictException(
          `This ${field} is already in use by another category.`,
        );
      }
      throw error;
    }
  }

  async findAll(user: JwtPayload | undefined, pagination: PaginationDto) {
    const whereClause =
      user?.role === 'ADMIN' ? undefined : { where: { status: 'ACTIVE' } };
    return paginate(
      this.prisma.category,
      {
        page: pagination.page,
        limit: pagination.limit,
      },
      {
        where: whereClause,
      },
    );
  }

  async findOneById(id: string, user: JwtPayload | undefined) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!category || (category.status === 'HIDDEN' && user?.role !== 'ADMIN')) {
      throw new NotFoundException(`Category with ID "${id}" not found.`);
    }
    return category;
  }

  async findOneBySlug(slug: string, user: JwtPayload | undefined) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
    });
    if (!category || (category.status === 'HIDDEN' && user?.role !== 'ADMIN')) {
      throw new NotFoundException(`Category "${slug}" not found.`);
    }
    return category;
  }

  async switchStatus(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found.`);
    }
    return await this.prisma.category.update({
      where: { id },
      data:
        category.status === 'HIDDEN'
          ? { status: 'VISIBLE' }
          : { status: 'HIDDEN' },
    });
  }
}
