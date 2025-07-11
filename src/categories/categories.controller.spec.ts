import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { JwtPayload } from 'src/auth/interfaces/jwtPayload.interface';
import { UserRole, CategoryStatus } from 'generated/prisma';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('CategoriesController', () => {
  let controller: CategoriesController;

  const mockCategoriesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOneById: jest.fn(),
    findOneBySlug: jest.fn(),
    switchStatus: jest.fn(),
  };

  const mockUser: JwtPayload = {
    sub: 'user-id-123',
    email: 'test@example.com',
    role: UserRole.USER,
  };

  const mockAdminUser: JwtPayload = {
    sub: 'admin-id-123',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };

  const mockCategory = {
    id: 'category-id-123',
    name: 'Electronics',
    slug: 'electronics',
    status: CategoryStatus.VISIBLE,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: mockCategoriesService,
        },
      ],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createCategoryDto: CreateCategoryDto = {
      name: 'Electronics',
      slug: 'electronics',
    };

    it('should create a new category', async () => {
      mockCategoriesService.create.mockResolvedValue(mockCategory);

      const result = await controller.create(createCategoryDto);

      expect(mockCategoriesService.create).toHaveBeenCalledWith(
        createCategoryDto,
      );
      expect(result).toEqual(mockCategory);
    });

    it('should handle service errors during category creation', async () => {
      const error = new ConflictException(
        'This name is already in use by another category.',
      );
      mockCategoriesService.create.mockRejectedValue(error);

      await expect(controller.create(createCategoryDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockCategoriesService.create).toHaveBeenCalledWith(
        createCategoryDto,
      );
    });
  });

  describe('findAll', () => {
    const paginationDto: PaginationDto = {
      page: 1,
      limit: 10,
    };

    const mockPaginatedCategories = {
      data: [mockCategory],
      meta: {
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    };

    it('should return paginated categories for authenticated user', async () => {
      mockCategoriesService.findAll.mockResolvedValue(mockPaginatedCategories);

      const result = await controller.findAll(mockUser, paginationDto);

      expect(mockCategoriesService.findAll).toHaveBeenCalledWith(
        mockUser,
        paginationDto,
      );
      expect(result).toEqual(mockPaginatedCategories);
    });

    it('should return paginated categories for admin user', async () => {
      mockCategoriesService.findAll.mockResolvedValue(mockPaginatedCategories);

      const result = await controller.findAll(mockAdminUser, paginationDto);

      expect(mockCategoriesService.findAll).toHaveBeenCalledWith(
        mockAdminUser,
        paginationDto,
      );
      expect(result).toEqual(mockPaginatedCategories);
    });

    it('should return paginated categories for unauthenticated user', async () => {
      mockCategoriesService.findAll.mockResolvedValue(mockPaginatedCategories);

      const result = await controller.findAll(undefined, paginationDto);

      expect(mockCategoriesService.findAll).toHaveBeenCalledWith(
        undefined,
        paginationDto,
      );
      expect(result).toEqual(mockPaginatedCategories);
    });

    it('should handle service errors during findAll', async () => {
      const error = new Error('Database connection failed');
      mockCategoriesService.findAll.mockRejectedValue(error);

      await expect(controller.findAll(mockUser, paginationDto)).rejects.toThrow(
        error,
      );
    });
  });

  describe('findOneById', () => {
    const categoryId = 'category-id-123';

    it('should return a category by ID for authenticated user', async () => {
      mockCategoriesService.findOneById.mockResolvedValue(mockCategory);

      const result = await controller.findOneById(categoryId, mockUser);

      expect(mockCategoriesService.findOneById).toHaveBeenCalledWith(
        categoryId,
        mockUser,
      );
      expect(result).toEqual(mockCategory);
    });

    it('should return a category by ID for admin user', async () => {
      const hiddenCategory = { ...mockCategory, status: CategoryStatus.HIDDEN };
      mockCategoriesService.findOneById.mockResolvedValue(hiddenCategory);

      const result = await controller.findOneById(categoryId, mockAdminUser);

      expect(mockCategoriesService.findOneById).toHaveBeenCalledWith(
        categoryId,
        mockAdminUser,
      );
      expect(result).toEqual(hiddenCategory);
    });

    it('should return a category by ID for unauthenticated user', async () => {
      mockCategoriesService.findOneById.mockResolvedValue(mockCategory);

      const result = await controller.findOneById(categoryId, undefined);

      expect(mockCategoriesService.findOneById).toHaveBeenCalledWith(
        categoryId,
        undefined,
      );
      expect(result).toEqual(mockCategory);
    });

    it('should handle category not found', async () => {
      const error = new NotFoundException(
        `Category with ID "${categoryId}" not found.`,
      );
      mockCategoriesService.findOneById.mockRejectedValue(error);

      await expect(
        controller.findOneById(categoryId, mockUser),
      ).rejects.toThrow(NotFoundException);
      expect(mockCategoriesService.findOneById).toHaveBeenCalledWith(
        categoryId,
        mockUser,
      );
    });
  });

  describe('findOneBySlug', () => {
    const slug = 'electronics';

    it('should return a category by slug for authenticated user', async () => {
      mockCategoriesService.findOneBySlug.mockResolvedValue(mockCategory);

      const result = await controller.findOneBySlug(slug, mockUser);

      expect(mockCategoriesService.findOneBySlug).toHaveBeenCalledWith(
        slug,
        mockUser,
      );
      expect(result).toEqual(mockCategory);
    });

    it('should return a category by slug for admin user', async () => {
      const hiddenCategory = { ...mockCategory, status: CategoryStatus.HIDDEN };
      mockCategoriesService.findOneBySlug.mockResolvedValue(hiddenCategory);

      const result = await controller.findOneBySlug(slug, mockAdminUser);

      expect(mockCategoriesService.findOneBySlug).toHaveBeenCalledWith(
        slug,
        mockAdminUser,
      );
      expect(result).toEqual(hiddenCategory);
    });

    it('should return a category by slug for unauthenticated user', async () => {
      mockCategoriesService.findOneBySlug.mockResolvedValue(mockCategory);

      const result = await controller.findOneBySlug(slug, undefined);

      expect(mockCategoriesService.findOneBySlug).toHaveBeenCalledWith(
        slug,
        undefined,
      );
      expect(result).toEqual(mockCategory);
    });

    it('should handle category not found by slug', async () => {
      const error = new NotFoundException(`Category "${slug}" not found.`);
      mockCategoriesService.findOneBySlug.mockRejectedValue(error);

      await expect(controller.findOneBySlug(slug, mockUser)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockCategoriesService.findOneBySlug).toHaveBeenCalledWith(
        slug,
        mockUser,
      );
    });
  });

  describe('switchStatus', () => {
    const categoryId = 'category-id-123';

    it('should switch category status from visible to hidden', async () => {
      const updatedCategory = {
        ...mockCategory,
        status: CategoryStatus.HIDDEN,
      };
      mockCategoriesService.switchStatus.mockResolvedValue(updatedCategory);

      const result = await controller.switchStatus(categoryId);

      expect(mockCategoriesService.switchStatus).toHaveBeenCalledWith(
        categoryId,
      );
      expect(result).toEqual(updatedCategory);
    });

    it('should switch category status from hidden to visible', async () => {
      const updatedCategory = {
        ...mockCategory,
        status: CategoryStatus.VISIBLE,
      };
      mockCategoriesService.switchStatus.mockResolvedValue(updatedCategory);

      const result = await controller.switchStatus(categoryId);

      expect(mockCategoriesService.switchStatus).toHaveBeenCalledWith(
        categoryId,
      );
      expect(result).toEqual(updatedCategory);
    });

    it('should handle category not found during status switch', async () => {
      const error = new NotFoundException(
        `Category with ID "${categoryId}" not found.`,
      );
      mockCategoriesService.switchStatus.mockRejectedValue(error);

      await expect(controller.switchStatus(categoryId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockCategoriesService.switchStatus).toHaveBeenCalledWith(
        categoryId,
      );
    });

    it('should handle service errors during status switch', async () => {
      const error = new Error('Database update failed');
      mockCategoriesService.switchStatus.mockRejectedValue(error);

      await expect(controller.switchStatus(categoryId)).rejects.toThrow(error);
      expect(mockCategoriesService.switchStatus).toHaveBeenCalledWith(
        categoryId,
      );
    });
  });
});
