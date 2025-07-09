import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, Product, ProductStatus } from 'generated/prisma';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { AddCategoryDto } from './dto/add-category.dto';
import { JwtPayload } from 'src/auth/interfaces/jwtPayload.interface';
import { publicProductSelect } from './util/select';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { paginate } from 'src/common/utils/paginator';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateProductDto) {
    try {
      return await this.prisma.product.create({
        data: data,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const field = error.meta?.target?.[0] as string;
        throw new ConflictException(
          `This ${field} is already in use by another product.`,
        );
      }
    }
  }

  async findAll(pagination: PaginationDto, user: JwtPayload | undefined) {
    const select = user?.role === 'ADMIN' ? undefined : publicProductSelect;
    return paginate<Product>(
      this.prisma.product,
      {
        page: pagination.page,
        limit: pagination.limit,
      },
      {
        select: select,
        orderBy: {
          createdAt: 'desc',
        },
      },
    );
  }

  async findOneById(id: string, user: JwtPayload | undefined) {
    const select = user?.role === 'ADMIN' ? undefined : publicProductSelect;
    const product = await this.prisma.product.findUnique({
      where: { id },
      select,
    });
    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found.`);
    }
    return product;
  }

  async findOneBySlug(slug: string, user: JwtPayload | undefined) {
    const select = user?.role === 'ADMIN' ? undefined : publicProductSelect;
    const product = await this.prisma.product.findUnique({
      where: { slug },
      select,
    });
    if (!product) {
      throw new NotFoundException(`Product with slug "${slug}" not found.`);
    }
    return product;
  }

  async findAllByCategory(
    categoryId: string,
    pagination: PaginationDto,
    user: JwtPayload | undefined,
  ) {
    const select = user?.role === 'ADMIN' ? undefined : publicProductSelect;

    const whereClause = {
      categories: { some: { category: { id: categoryId } } },
      status: ProductStatus.ACTIVE,
    };

    return paginate<Product>(
      this.prisma.product,
      {
        page: pagination.page,
        limit: pagination.limit,
      },
      {
        where: whereClause,
        select: select,
        orderBy: {
          createdAt: 'desc',
        },
      },
    );
  }

  async update(id: string, updateData: UpdateProductDto) {
    try {
      const updatedProduct = await this.prisma.product.update({
        where: { id },
        data: updateData,
      });
      return updatedProduct;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Product with ID "${id}" not found.`);
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const field = error.meta?.target?.[0] as string;
        throw new ConflictException(
          `The ${field} is already in use by another product.`,
        );
      }
      throw error;
    }
  }

  async addCategory(productId: string, addCategory: AddCategoryDto) {
    const { categoryId } = addCategory;
    const [product, category] = await Promise.all([
      this.prisma.product.findUnique({ where: { id: productId } }),
      this.prisma.category.findUnique({ where: { id: categoryId } }),
    ]);

    if (!product) {
      throw new NotFoundException(`Product with ID "${productId}" not found.`);
    }
    if (!category) {
      throw new NotFoundException(
        `Category with ID "${categoryId}" not found.`,
      );
    }
    try {
      return await this.prisma.productCategory.create({
        data: {
          productId: productId,
          categoryId: categoryId,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `This product is already associated with this category.`,
        );
      }
      throw error;
    }
  }

  async updateStatus(
    id: string,
    updateProductStatusDto: UpdateProductStatusDto,
  ) {
    try {
      return await this.prisma.product.update({
        where: { id },
        data: updateProductStatusDto,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Product with ID "${id}" not found.`);
      }
      throw error;
    }
  }
}
