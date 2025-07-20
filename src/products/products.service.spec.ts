/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProductStatus } from '../../generated/prisma';
import { Prisma } from '../../generated/prisma';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { AddCategoryDto } from './dto/add-category.dto';
import { FilterProductsDto } from './dto/filter-product.dto';
import { JwtPayload } from '../auth/interfaces/jwtPayload.interface';
import { UserRole } from '../../generated/prisma';
import { join } from 'path';
import { paginate } from '../common/utils/paginator';
import * as fs from 'fs';

// Mock fs module
// eslint-disable-next-line @typescript-eslint/no-unsafe-return
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  unlinkSync: jest.fn(),
}));

// Mock paginate function
jest.mock('../common/utils/paginator', () => ({
  paginate: jest.fn(),
}));

const mockPrismaService = () => ({
  product: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  category: {
    findUnique: jest.fn(),
  },
  productCategory: {
    create: jest.fn(),
  },
  productImage: {
    findUnique: jest.fn(),
    createMany: jest.fn(),
    delete: jest.fn(),
  },
});

const mockPaginate = paginate as jest.MockedFunction<typeof paginate>;
const mockFs = fs as jest.Mocked<typeof fs>;

describe('ProductsService', () => {
  let service: ProductsService;
  let prismaService: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useFactory: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prismaService = module.get(PrismaService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createProductDto: CreateProductDto = {
      name: 'Test Product',
      description: 'Test Description',
      sku: 'TEST-SKU-001',
      slug: 'test-product',
      currentPrice: 99.99,
      oldPrice: 129.99,
      stockQuantity: 10,
      tags: ['test', 'product'],
    };

    const mockProduct = {
      id: '1',
      ...createProductDto,
      status: ProductStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a product successfully', async () => {
      prismaService.product.create.mockResolvedValue(mockProduct);

      const result = await service.create(createProductDto);

      expect(prismaService.product.create).toHaveBeenCalledWith({
        data: createProductDto,
      });
      expect(result).toEqual(mockProduct);
    });

    it('should throw ConflictException when slug already exists', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: { target: ['slug'] },
        },
      );
      prismaService.product.create.mockRejectedValue(prismaError);

      await expect(service.create(createProductDto)).rejects.toThrow(
        new ConflictException(
          'This slug is already in use by another product.',
        ),
      );
    });

    it('should rethrow unknown errors', async () => {
      const unknownError = new Error('Unknown error');
      prismaService.product.create.mockRejectedValue(unknownError);

      await expect(service.create(createProductDto)).rejects.toThrow(
        unknownError,
      );
    });
  });

  describe('findAll', () => {
    const mockProducts = [
      {
        id: '1',
        name: 'Product 1',
        description: 'Description 1',
        currentPrice: 99.99,
        status: ProductStatus.ACTIVE,
      },
    ];

    const mockPaginatedResult = {
      data: mockProducts,
      total: 1,
      page: 1,
      limit: 10,
      pages: 1,
    };

    it('should return paginated products for public users', async () => {
      const filterDto: FilterProductsDto = {
        page: 1,
        limit: 10,
        search: 'product',
        categorySlug: 'electronics',
        minPrice: 50,
        maxPrice: 150,
        sortBy: 'name',
        sortOrder: 'asc',
      };

      mockPaginate.mockResolvedValue(mockPaginatedResult);

      const result = await service.findAll(filterDto, undefined);

      expect(mockPaginate).toHaveBeenCalledWith(
        prismaService.product,
        { page: 1, limit: 10 },
        expect.objectContaining({
          where: expect.objectContaining({
            status: ProductStatus.ACTIVE,
            OR: expect.any(Array),
            categories: { some: { category: { slug: 'electronics' } } },
            currentPrice: { gte: 50, lte: 150 },
          }),
          select: expect.any(Object),
          orderBy: { name: 'asc' },
        }),
      );
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should return all products for admin users', async () => {
      const adminUser: JwtPayload = {
        sub: '1',
        email: 'admin@test.com',
        role: UserRole.ADMIN,
      };

      const filterDto: FilterProductsDto = {
        page: 1,
        limit: 10,
      };

      mockPaginate.mockResolvedValue(mockPaginatedResult);

      await service.findAll(filterDto, adminUser);

      expect(mockPaginate).toHaveBeenCalledWith(
        prismaService.product,
        { page: 1, limit: 10 },
        expect.objectContaining({
          where: {},
          select: undefined,
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should use default sorting when sortBy is invalid', async () => {
      const filterDto: FilterProductsDto = {
        page: 1,
        limit: 10,
        sortBy: 'invalidField',
      };

      mockPaginate.mockResolvedValue(mockPaginatedResult);

      await service.findAll(filterDto, undefined);

      expect(mockPaginate).toHaveBeenCalledWith(
        prismaService.product,
        { page: 1, limit: 10 },
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('findOneById', () => {
    const productId = '1';
    const mockProduct = {
      id: '1',
      name: 'Test Product',
      description: 'Test Description',
      status: ProductStatus.ACTIVE,
    };

    it('should return product by id for public users', async () => {
      prismaService.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.findOneById(productId, undefined);

      expect(prismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: productId },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockProduct);
    });

    it('should return full product data for admin users', async () => {
      const adminUser: JwtPayload = {
        sub: '1',
        email: 'admin@test.com',
        role: UserRole.ADMIN,
      };

      prismaService.product.findUnique.mockResolvedValue(mockProduct);

      await service.findOneById(productId, adminUser);

      expect(prismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: productId },
        select: undefined,
      });
    });

    it('should throw NotFoundException when product not found', async () => {
      prismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.findOneById(productId, undefined)).rejects.toThrow(
        new NotFoundException(`Product with ID "${productId}" not found.`),
      );
    });

    it('should throw NotFoundException when non-admin user tries to access inactive product', async () => {
      const inactiveProduct = {
        ...mockProduct,
        status: ProductStatus.INACTIVE,
      };

      prismaService.product.findUnique.mockResolvedValue(inactiveProduct);

      await expect(service.findOneById(productId, undefined)).rejects.toThrow(
        new NotFoundException(`Product with ID "${productId}" not found.`),
      );
    });

    it('should allow admin users to access inactive products', async () => {
      const adminUser: JwtPayload = {
        sub: '1',
        email: 'admin@test.com',
        role: UserRole.ADMIN,
      };

      const inactiveProduct = {
        ...mockProduct,
        status: ProductStatus.INACTIVE,
      };

      prismaService.product.findUnique.mockResolvedValue(inactiveProduct);

      const result = await service.findOneById(productId, adminUser);

      expect(result).toEqual(inactiveProduct);
    });
  });

  describe('findOneBySlug', () => {
    const slug = 'test-product';
    const mockProduct = {
      id: '1',
      name: 'Test Product',
      slug: 'test-product',
      status: ProductStatus.ACTIVE,
    };

    it('should return product by slug', async () => {
      prismaService.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.findOneBySlug(slug, undefined);

      expect(prismaService.product.findUnique).toHaveBeenCalledWith({
        where: { slug },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException when product not found', async () => {
      prismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.findOneBySlug(slug, undefined)).rejects.toThrow(
        new NotFoundException(`Product with slug "${slug}" not found.`),
      );
    });

    it('should throw NotFoundException when non-admin user tries to access inactive product', async () => {
      const inactiveProduct = {
        ...mockProduct,
        status: ProductStatus.INACTIVE,
      };

      prismaService.product.findUnique.mockResolvedValue(inactiveProduct);

      await expect(service.findOneBySlug(slug, undefined)).rejects.toThrow(
        new NotFoundException(`Product with slug "${slug}" not found.`),
      );
    });
  });

  describe('update', () => {
    const productId = '1';
    const updateProductDto: UpdateProductDto = {
      name: 'Updated Product',
      currentPrice: 149.99,
    };

    const mockUpdatedProduct = {
      id: '1',
      name: 'Updated Product',
      currentPrice: 149.99,
      updatedAt: new Date(),
    };

    it('should update product successfully', async () => {
      prismaService.product.update.mockResolvedValue(mockUpdatedProduct);

      const result = await service.update(productId, updateProductDto);

      expect(prismaService.product.update).toHaveBeenCalledWith({
        where: { id: productId },
        data: updateProductDto,
      });
      expect(result).toEqual(mockUpdatedProduct);
    });

    it('should throw NotFoundException when product not found', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        {
          code: 'P2025',
          clientVersion: '5.0.0',
        },
      );
      prismaService.product.update.mockRejectedValue(prismaError);

      await expect(service.update(productId, updateProductDto)).rejects.toThrow(
        new NotFoundException(`Product with ID "${productId}" not found.`),
      );
    });

    it('should throw ConflictException when unique constraint fails', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: { target: ['slug'] },
        },
      );
      prismaService.product.update.mockRejectedValue(prismaError);

      await expect(service.update(productId, updateProductDto)).rejects.toThrow(
        new ConflictException(
          'This slug is already in use by another product.',
        ),
      );
    });
  });

  describe('addCategory', () => {
    const productId = '1';
    const addCategoryDto: AddCategoryDto = {
      categoryId: 'cat-1',
    };

    const mockProduct = { id: '1', name: 'Test Product' };
    const mockCategory = { id: 'cat-1', name: 'Test Category' };
    const mockProductCategory = {
      id: '1',
      productId: '1',
      categoryId: 'cat-1',
    };

    it('should add category to product successfully', async () => {
      prismaService.product.findUnique.mockResolvedValue(mockProduct);
      prismaService.category.findUnique.mockResolvedValue(mockCategory);
      prismaService.productCategory.create.mockResolvedValue(
        mockProductCategory,
      );

      const result = await service.addCategory(productId, addCategoryDto);

      expect(prismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: productId },
      });
      expect(prismaService.category.findUnique).toHaveBeenCalledWith({
        where: { id: addCategoryDto.categoryId },
      });
      expect(prismaService.productCategory.create).toHaveBeenCalledWith({
        data: {
          productId,
          categoryId: addCategoryDto.categoryId,
        },
      });
      expect(result).toEqual(mockProductCategory);
    });

    it('should throw NotFoundException when product not found', async () => {
      prismaService.product.findUnique.mockResolvedValue(null);
      prismaService.category.findUnique.mockResolvedValue(mockCategory);

      await expect(
        service.addCategory(productId, addCategoryDto),
      ).rejects.toThrow(
        new NotFoundException(`Product with ID "${productId}" not found.`),
      );
    });

    it('should throw NotFoundException when category not found', async () => {
      prismaService.product.findUnique.mockResolvedValue(mockProduct);
      prismaService.category.findUnique.mockResolvedValue(null);

      await expect(
        service.addCategory(productId, addCategoryDto),
      ).rejects.toThrow(
        new NotFoundException(
          `Category with ID "${addCategoryDto.categoryId}" not found.`,
        ),
      );
    });

    it('should throw ConflictException when association already exists', async () => {
      prismaService.product.findUnique.mockResolvedValue(mockProduct);
      prismaService.category.findUnique.mockResolvedValue(mockCategory);

      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
        },
      );
      prismaService.productCategory.create.mockRejectedValue(prismaError);

      await expect(
        service.addCategory(productId, addCategoryDto),
      ).rejects.toThrow(
        new ConflictException(
          'This product is already associated with this category.',
        ),
      );
    });
  });

  describe('updateStatus', () => {
    const productId = '1';
    const updateProductStatusDto: UpdateProductStatusDto = {
      status: ProductStatus.INACTIVE,
    };

    const mockUpdatedProduct = {
      id: '1',
      status: ProductStatus.INACTIVE,
      updatedAt: new Date(),
    };

    it('should update product status successfully', async () => {
      prismaService.product.update.mockResolvedValue(mockUpdatedProduct);

      const result = await service.updateStatus(
        productId,
        updateProductStatusDto,
      );

      expect(prismaService.product.update).toHaveBeenCalledWith({
        where: { id: productId },
        data: updateProductStatusDto,
      });
      expect(result).toEqual(mockUpdatedProduct);
    });

    it('should throw NotFoundException when product not found', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        {
          code: 'P2025',
          clientVersion: '5.0.0',
        },
      );
      prismaService.product.update.mockRejectedValue(prismaError);

      await expect(
        service.updateStatus(productId, updateProductStatusDto),
      ).rejects.toThrow(
        new NotFoundException(`Product with ID "${productId}" not found.`),
      );
    });
  });

  describe('addImages', () => {
    const productId = '1';
    const mockFiles = [
      {
        filename: 'image1.jpg',
        originalname: 'original1.jpg',
      } as Express.Multer.File,
      {
        filename: 'image2.jpg',
        originalname: 'original2.jpg',
      } as Express.Multer.File,
    ];

    const mockProduct = { id: '1', name: 'Test Product' };
    const mockProductWithImages = {
      ...mockProduct,
      images: [
        { id: '1', url: '/uploads/image1.jpg', altText: 'original1.jpg' },
        { id: '2', url: '/uploads/image2.jpg', altText: 'original2.jpg' },
      ],
    };

    it('should add images to product successfully', async () => {
      prismaService.product.findUnique
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce(mockProductWithImages);
      prismaService.productImage.createMany.mockResolvedValue({ count: 2 });

      const result = await service.addImages(productId, mockFiles);

      expect(prismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: productId },
      });
      expect(prismaService.productImage.createMany).toHaveBeenCalledWith({
        data: [
          {
            productId,
            url: '/uploads/image1.jpg',
            altText: 'original1.jpg',
          },
          {
            productId,
            url: '/uploads/image2.jpg',
            altText: 'original2.jpg',
          },
        ],
      });
      expect(prismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: productId },
        include: { images: true },
      });
      expect(result).toEqual(mockProductWithImages);
    });

    it('should throw NotFoundException when product not found', async () => {
      prismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.addImages(productId, mockFiles)).rejects.toThrow(
        new NotFoundException(`Product with ID "${productId}" not found.`),
      );
    });

    it('should throw NotFoundException when no files are provided', async () => {
      await expect(service.addImages(productId, [])).rejects.toThrow(
        new NotFoundException('No files provided for upload.'),
      );
    });

    it('should throw NotFoundException when files array is null or undefined', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await expect(service.addImages(productId, null as any)).rejects.toThrow(
        new NotFoundException('No files provided for upload.'),
      );

      await expect(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        service.addImages(productId, undefined as any),
      ).rejects.toThrow(new NotFoundException('No files provided for upload.'));
    });
  });

  describe('removeImage', () => {
    const imageId = '1';
    const mockImage = {
      id: '1',
      url: '/uploads/image1.jpg',
      altText: 'test image',
    };

    it('should remove image successfully', async () => {
      prismaService.productImage.findUnique.mockResolvedValue(mockImage);
      prismaService.productImage.delete.mockResolvedValue(mockImage);
      mockFs.unlinkSync.mockImplementation(() => {});

      await service.removeImage(imageId);

      expect(prismaService.productImage.findUnique).toHaveBeenCalledWith({
        where: { id: imageId },
      });
      expect(prismaService.productImage.delete).toHaveBeenCalledWith({
        where: { id: imageId },
      });
      expect(mockFs.unlinkSync).toHaveBeenCalledWith(
        join(process.cwd(), 'uploads/image1.jpg'),
      );
    });

    it('should throw NotFoundException when image not found', async () => {
      prismaService.productImage.findUnique.mockResolvedValue(null);

      await expect(service.removeImage(imageId)).rejects.toThrow(
        new NotFoundException(`Image with ID "${imageId}" not found.`),
      );
    });

    it('should handle file deletion errors gracefully', async () => {
      prismaService.productImage.findUnique.mockResolvedValue(mockImage);
      prismaService.productImage.delete.mockResolvedValue(mockImage);
      mockFs.unlinkSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await service.removeImage(imageId);

      expect(consoleSpy).toHaveBeenCalledWith(
        `Failed to delete file: ${mockImage.url}`,
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });
});
