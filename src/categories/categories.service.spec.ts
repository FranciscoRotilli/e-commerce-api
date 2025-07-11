import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { JwtPayload } from 'src/auth/interfaces/jwtPayload.interface';
import { UserRole, CategoryStatus } from 'generated/prisma';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as paginateModule from 'src/common/utils/paginator';

// Mock the paginate function
jest.mock('src/common/utils/paginator', () => ({
  paginate: jest.fn(),
}));

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    category: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
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
      providers: [
        CategoriesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createCategoryDto: CreateCategoryDto = {
      name: 'Electronics',
      slug: 'electronics',
    };

    it('should create a category with provided slug', async () => {
      mockPrismaService.category.create.mockResolvedValue(mockCategory);

      const result = await service.create(createCategoryDto);

      expect(mockPrismaService.category.create).toHaveBeenCalledWith({
        data: {
          name: 'Electronics',
          slug: 'electronics',
        },
      });
      expect(result).toEqual(mockCategory);
    });

    it('should handle duplicate name conflict', async () => {
      // Mock the create method to reject with a specific error
      mockPrismaService.category.create.mockRejectedValue(
        new ConflictException(
          'This name is already in use by another category.',
        ),
      );

      await expect(service.create(createCategoryDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    const paginationDto: PaginationDto = {
      page: 1,
      limit: 10,
    };

    const mockPaginatedResult = {
      data: [mockCategory],
      meta: {
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    };

    beforeEach(() => {
      (paginateModule.paginate as jest.Mock).mockResolvedValue(
        mockPaginatedResult,
      );
    });

    it('should return all categories for admin users', async () => {
      const result = await service.findAll(mockAdminUser, paginationDto);

      expect(paginateModule.paginate).toHaveBeenCalledWith(
        prismaService.category,
        { page: 1, limit: 10 },
        { where: {} },
      );
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should return only visible categories for regular users', async () => {
      const result = await service.findAll(mockUser, paginationDto);

      expect(paginateModule.paginate).toHaveBeenCalledWith(
        prismaService.category,
        { page: 1, limit: 10 },
        { where: { status: CategoryStatus.VISIBLE } },
      );
      expect(result).toEqual(mockPaginatedResult);
    });
  });

  describe('findOneById', () => {
    const categoryId = 'category-id-123';

    it('should return a visible category for regular users', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);

      const result = await service.findOneById(categoryId, mockUser);

      expect(result).toEqual(mockCategory);
    });

    it('should throw NotFoundException when category does not exist', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(service.findOneById(categoryId, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('switchStatus', () => {
    const categoryId = 'category-id-123';

    it('should switch visible category to hidden', async () => {
      const updatedCategory = {
        ...mockCategory,
        status: CategoryStatus.HIDDEN,
      };
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);
      mockPrismaService.category.update.mockResolvedValue(updatedCategory);

      const result = await service.switchStatus(categoryId);

      expect(mockPrismaService.category.update).toHaveBeenCalledWith({
        where: { id: categoryId },
        data: { status: CategoryStatus.HIDDEN },
      });
      expect(result).toEqual(updatedCategory);
    });

    it('should throw NotFoundException when category does not exist', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(service.switchStatus(categoryId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
