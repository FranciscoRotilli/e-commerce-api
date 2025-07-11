/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { UserRole, ProductStatus } from '../../generated/prisma';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { AddCategoryDto } from './dto/add-category.dto';
import { JwtPayload } from 'src/auth/interfaces/jwtPayload.interface';
import { BadRequestException } from '@nestjs/common';

const mockProductsService = () => ({
  create: jest.fn(),
  findAll: jest.fn(),
  findOneById: jest.fn(),
  findOneBySlug: jest.fn(),
  update: jest.fn(),
  updateStatus: jest.fn(),
  addCategory: jest.fn(),
  addImages: jest.fn(),
  removeImage: jest.fn(),
});

describe('ProductsController', () => {
  let controller: ProductsController;
  let productsService: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useFactory: mockProductsService,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    productsService = module.get(ProductsService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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

    const mockCreatedProduct = {
      id: '1',
      ...createProductDto,
      status: ProductStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a new product', async () => {
      productsService.create.mockResolvedValue(mockCreatedProduct);

      const result = await controller.create(createProductDto);

      expect(productsService.create).toHaveBeenCalledWith(createProductDto);
      expect(result).toEqual(mockCreatedProduct);
    });

    it('should pass through service errors', async () => {
      const error = new Error('Slug already exists');
      productsService.create.mockRejectedValue(error);

      await expect(controller.create(createProductDto)).rejects.toThrow(error);
    });
  });

  describe('findAll', () => {
    const mockPaginatedResult = {
      data: [
        {
          id: '1',
          name: 'Product 1',
          slug: 'product-1',
          currentPrice: 99.99,
          status: ProductStatus.ACTIVE,
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
      pages: 1,
    };

    it('should return paginated products for public users', async () => {
      productsService.findAll.mockResolvedValue(mockPaginatedResult);

      const result = await controller.findAll(
        { page: 1, limit: 10 },
        undefined,
      );

      expect(productsService.findAll).toHaveBeenCalledWith(
        { page: 1, limit: 10 },
        undefined,
      );
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should return products for admin users', async () => {
      const adminUser: JwtPayload = {
        sub: '1',
        email: 'admin@test.com',
        role: UserRole.ADMIN,
      };

      productsService.findAll.mockResolvedValue(mockPaginatedResult);

      const result = await controller.findAll(
        { page: 1, limit: 10 },
        adminUser,
      );

      expect(productsService.findAll).toHaveBeenCalledWith(
        { page: 1, limit: 10 },
        adminUser,
      );
      expect(result).toEqual(mockPaginatedResult);
    });
  });

  describe('findOneById', () => {
    const productId = '1';
    const mockProduct = {
      id: '1',
      name: 'Test Product',
      slug: 'test-product',
      currentPrice: 99.99,
      status: ProductStatus.ACTIVE,
    };

    it('should return product by id', async () => {
      productsService.findOneById.mockResolvedValue(mockProduct);

      const result = await controller.findOneById(productId, undefined);

      expect(productsService.findOneById).toHaveBeenCalledWith(
        productId,
        undefined,
      );
      expect(result).toEqual(mockProduct);
    });

    it('should pass through service errors', async () => {
      const error = new Error('Product not found');
      productsService.findOneById.mockRejectedValue(error);

      await expect(
        controller.findOneById(productId, undefined),
      ).rejects.toThrow(error);
    });
  });

  describe('findOneBySlug', () => {
    const slug = 'test-product';
    const mockProduct = {
      id: '1',
      name: 'Test Product',
      slug: 'test-product',
      currentPrice: 99.99,
      status: ProductStatus.ACTIVE,
    };

    it('should return product by slug', async () => {
      productsService.findOneBySlug.mockResolvedValue(mockProduct);

      const result = await controller.findOneBySlug(slug, undefined);

      expect(productsService.findOneBySlug).toHaveBeenCalledWith(
        slug,
        undefined,
      );
      expect(result).toEqual(mockProduct);
    });

    it('should pass through service errors', async () => {
      const error = new Error('Product not found');
      productsService.findOneBySlug.mockRejectedValue(error);

      await expect(controller.findOneBySlug(slug, undefined)).rejects.toThrow(
        error,
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

    it('should update product', async () => {
      productsService.update.mockResolvedValue(mockUpdatedProduct);

      const result = await controller.update(productId, updateProductDto);

      expect(productsService.update).toHaveBeenCalledWith(
        productId,
        updateProductDto,
      );
      expect(result).toEqual(mockUpdatedProduct);
    });

    it('should pass through service errors', async () => {
      const error = new Error('Product not found');
      productsService.update.mockRejectedValue(error);

      await expect(
        controller.update(productId, updateProductDto),
      ).rejects.toThrow(error);
    });
  });

  describe('updateStatus', () => {
    const productId = '1';
    const updateStatusDto: UpdateProductStatusDto = {
      status: ProductStatus.INACTIVE,
    };

    it('should update product status', async () => {
      const mockUpdatedProduct = {
        id: '1',
        status: ProductStatus.INACTIVE,
        updatedAt: new Date(),
      };

      productsService.updateStatus.mockResolvedValue(mockUpdatedProduct);

      const result = await controller.updateStatus(productId, updateStatusDto);

      expect(productsService.updateStatus).toHaveBeenCalledWith(
        productId,
        updateStatusDto,
      );
      expect(result).toEqual(mockUpdatedProduct);
    });

    it('should pass through service errors', async () => {
      const error = new Error('Product not found');
      productsService.updateStatus.mockRejectedValue(error);

      await expect(
        controller.updateStatus(productId, updateStatusDto),
      ).rejects.toThrow(error);
    });
  });

  describe('addCategory', () => {
    const productId = '1';
    const addCategoryDto: AddCategoryDto = {
      categoryId: 'cat-1',
    };

    it('should add category to product', async () => {
      const mockProductCategory = {
        id: '1',
        productId: '1',
        categoryId: 'cat-1',
      };

      productsService.addCategory.mockResolvedValue(mockProductCategory);

      const result = await controller.addCategory(productId, addCategoryDto);

      expect(productsService.addCategory).toHaveBeenCalledWith(
        productId,
        addCategoryDto,
      );
      expect(result).toEqual(mockProductCategory);
    });

    it('should pass through service errors', async () => {
      const error = new Error('Product or category not found');
      productsService.addCategory.mockRejectedValue(error);

      await expect(
        controller.addCategory(productId, addCategoryDto),
      ).rejects.toThrow(error);
    });
  });

  describe('uploadImages', () => {
    const productId = '1';
    const mockFiles = [
      {
        filename: 'image1.jpg',
        originalname: 'original1.jpg',
      } as Express.Multer.File,
    ];

    it('should upload images to product', async () => {
      const mockProductWithImages = {
        id: '1',
        images: [{ id: '1', url: '/uploads/image1.jpg' }],
      };

      productsService.addImages.mockResolvedValue(mockProductWithImages);

      const result = await controller.uploadImages(productId, mockFiles);

      expect(productsService.addImages).toHaveBeenCalledWith(
        productId,
        mockFiles,
      );
      expect(result).toEqual(mockProductWithImages);
    });

    it('should throw BadRequestException when no files provided', () => {
      expect(() => controller.uploadImages(productId, [])).toThrow(
        new BadRequestException('You must upload at least one file.'),
      );
    });

    it('should pass through service errors', async () => {
      const error = new Error('Product not found');
      productsService.addImages.mockRejectedValue(error);

      await expect(
        controller.uploadImages(productId, mockFiles),
      ).rejects.toThrow(error);
    });
  });

  describe('removeImage', () => {
    const imageId = '1';

    it('should remove image', async () => {
      productsService.removeImage.mockResolvedValue(undefined);

      await controller.removeImage(imageId);

      expect(productsService.removeImage).toHaveBeenCalledWith(imageId);
    });

    it('should pass through service errors', async () => {
      const error = new Error('Image not found');
      productsService.removeImage.mockRejectedValue(error);

      await expect(controller.removeImage(imageId)).rejects.toThrow(error);
    });
  });

  describe('HTTP Status Codes', () => {
    it('should use correct HTTP status for create endpoint', () => {
      const createMetadata = Reflect.getMetadata(
        '__httpCode__',
        // eslint-disable-next-line @typescript-eslint/unbound-method
        controller.create,
      );
      expect(createMetadata).toBe(201); // HttpStatus.CREATED
    });

    it('should use correct HTTP status for update endpoint', () => {
      const updateMetadata = Reflect.getMetadata(
        '__httpCode__',
        // eslint-disable-next-line @typescript-eslint/unbound-method
        controller.update,
      );
      expect(updateMetadata).toBe(200); // HttpStatus.OK
    });

    it('should use correct HTTP status for updateStatus endpoint', () => {
      const statusMetadata = Reflect.getMetadata(
        '__httpCode__',
        // eslint-disable-next-line @typescript-eslint/unbound-method
        controller.updateStatus,
      );
      expect(statusMetadata).toBe(200); // HttpStatus.OK
    });

    it('should use correct HTTP status for addCategory endpoint', () => {
      const categoryMetadata = Reflect.getMetadata(
        '__httpCode__',
        // eslint-disable-next-line @typescript-eslint/unbound-method
        controller.addCategory,
      );
      expect(categoryMetadata).toBe(201); // HttpStatus.CREATED
    });

    it('should use correct HTTP status for uploadImages endpoint', () => {
      const uploadMetadata = Reflect.getMetadata(
        '__httpCode__',
        // eslint-disable-next-line @typescript-eslint/unbound-method
        controller.uploadImages,
      );
      expect(uploadMetadata).toBe(201); // HttpStatus.CREATED
    });

    it('should use correct HTTP status for removeImage endpoint', () => {
      const removeMetadata = Reflect.getMetadata(
        '__httpCode__',
        // eslint-disable-next-line @typescript-eslint/unbound-method
        controller.removeImage,
      );
      expect(removeMetadata).toBe(204); // HttpStatus.NO_CONTENT
    });
  });

  describe('Role-based Access Control', () => {
    it('should require ADMIN role for create', () => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const roles = Reflect.getMetadata('roles', controller.create);
      expect(roles).toEqual([UserRole.ADMIN]);
    });

    it('should require ADMIN role for update', () => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const roles = Reflect.getMetadata('roles', controller.update);
      expect(roles).toEqual([UserRole.ADMIN]);
    });

    it('should require ADMIN role for updateStatus', () => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const roles = Reflect.getMetadata('roles', controller.updateStatus);
      expect(roles).toEqual([UserRole.ADMIN]);
    });

    it('should require ADMIN role for addCategory', () => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const roles = Reflect.getMetadata('roles', controller.addCategory);
      expect(roles).toEqual([UserRole.ADMIN]);
    });

    it('should require ADMIN role for uploadImages', () => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const roles = Reflect.getMetadata('roles', controller.uploadImages);
      expect(roles).toEqual([UserRole.ADMIN]);
    });

    it('should require ADMIN role for removeImage', () => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const roles = Reflect.getMetadata('roles', controller.removeImage);
      expect(roles).toEqual([UserRole.ADMIN]);
    });
  });

  describe('Public Routes', () => {
    it('should have public access for findAll', () => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const isPublic = Reflect.getMetadata('isPublic', controller.findAll);
      expect(isPublic).toBe(true);
    });

    it('should have public access for findOneById', () => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const isPublic = Reflect.getMetadata('isPublic', controller.findOneById);
      expect(isPublic).toBe(true);
    });

    it('should have public access for findOneBySlug', () => {
      const isPublic = Reflect.getMetadata(
        'isPublic',
        // eslint-disable-next-line @typescript-eslint/unbound-method
        controller.findOneBySlug,
      );
      expect(isPublic).toBe(true);
    });
  });
});
