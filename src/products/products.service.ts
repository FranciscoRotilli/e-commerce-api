import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, ProductStatus, UserRole } from 'generated/prisma';
import { AddCategoryDto } from './dto/add-category.dto';
import { JwtPayload } from 'src/auth/interfaces/jwtPayload.interface';
import { publicProductSelect } from './util/select';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { paginate } from 'src/common/utils/paginator';
import { FilterProductsDto } from './dto/filter-product.dto';
import { join } from 'path';
import * as fs from 'fs';

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
      throw error;
    }
  }

  async findAll(pagination: FilterProductsDto, user: JwtPayload | undefined) {
    const {
      page,
      limit,
      search,
      categoryId,
      minPrice,
      maxPrice,
      sortBy,
      sortOrder,
    } = pagination;

    const select =
      user?.role === UserRole.ADMIN ? undefined : publicProductSelect;
    const whereClause: Prisma.ProductWhereInput = {};

    if (user?.role !== UserRole.ADMIN) {
      whereClause.status = ProductStatus.ACTIVE;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { tags: { has: search.toLowerCase() } },
      ];
    }

    if (categoryId) {
      whereClause.categories = { some: { categoryId: categoryId } };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      whereClause.currentPrice = {};
      if (minPrice !== undefined) whereClause.currentPrice.gte = minPrice;
      if (maxPrice !== undefined) whereClause.currentPrice.lte = maxPrice;
    }

    const orderByClause: Prisma.ProductOrderByWithRelationInput = {};
    const allowedSortBy = ['name', 'currentPrice', 'createdAt'];

    if (sortBy && allowedSortBy.includes(sortBy)) {
      orderByClause[sortBy] = sortOrder ?? 'desc';
    } else {
      orderByClause.createdAt = 'desc';
    }

    return paginate(
      this.prisma.product,
      { page, limit },
      {
        where: whereClause,
        select,
        orderBy: orderByClause,
      },
    );
  }

  async findOneById(id: string, user: JwtPayload | undefined) {
    const select =
      user?.role === UserRole.ADMIN ? undefined : publicProductSelect;

    const product = await this.prisma.product.findUnique({
      where: { id },
      select,
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found.`);
    }

    if (
      user?.role !== UserRole.ADMIN &&
      product.status !== ProductStatus.ACTIVE
    ) {
      throw new NotFoundException(`Product with ID "${id}" not found.`);
    }

    return product;
  }

  async findOneBySlug(slug: string, user: JwtPayload | undefined) {
    const select =
      user?.role === UserRole.ADMIN ? undefined : publicProductSelect;

    const product = await this.prisma.product.findUnique({
      where: { slug },
      select,
    });

    if (!product) {
      throw new NotFoundException(`Product with slug "${slug}" not found.`);
    }

    if (
      user?.role !== UserRole.ADMIN &&
      product.status !== ProductStatus.ACTIVE
    ) {
      throw new NotFoundException(`Product with slug "${slug}" not found.`);
    }

    return product;
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
          `This ${field} is already in use by another product.`,
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

  async addImages(productId: string, files: Array<Express.Multer.File>) {
    if (!files || files.length === 0) {
      throw new NotFoundException('No files provided for upload.');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID "${productId}" not found.`);
    }
    const imageData = files.map((file) => ({
      productId: productId,
      url: `/uploads/${file.filename}`,
      altText: file.originalname,
    }));

    await this.prisma.productImage.createMany({
      data: imageData,
    });

    return this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        images: true,
      },
    });
  }

  async removeImage(imageId: string): Promise<void> {
    const image = await this.prisma.productImage.findUnique({
      where: { id: imageId },
    });
    if (!image) {
      throw new NotFoundException(`Image with ID "${imageId}" not found.`);
    }

    await this.prisma.productImage.delete({
      where: { id: imageId },
    });

    try {
      const relativePath = image.url.startsWith('/')
        ? image.url.slice(1)
        : image.url;
      const filePath = join(process.cwd(), relativePath);
      fs.unlinkSync(filePath);
    } catch (error) {
      console.error(`Failed to delete file: ${image.url}`, error);
    }
  }
}
