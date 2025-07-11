/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderStatus, UserRole, Prisma } from 'generated/prisma';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { SearchOrdersDto } from './dto/search-order.dto';
import { JwtPayload } from 'src/auth/interfaces/jwtPayload.interface';
import * as paginator from 'src/common/utils/paginator';

// Mock the paginator module
jest.mock('src/common/utils/paginator');

describe('OrdersService', () => {
  let service: OrdersService;
  let prismaService: any;

  const mockUser: JwtPayload = {
    sub: 'user-123',
    email: 'user@example.com',
    role: UserRole.USER,
  };

  const mockAdminUser: JwtPayload = {
    sub: 'admin-123',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };

  const mockProduct = {
    id: 'product-1',
    name: 'Test Product',
    currentPrice: 10.99,
    stockQuantity: 100,
  };

  const mockAddress = {
    id: 'address-1',
    userId: 'user-123',
    street: 'Test Street',
  };

  const mockOrder = {
    id: 'order-1',
    userId: 'user-123',
    addressId: 'address-1',
    total: 21.98,
    status: OrderStatus.PENDING,
    createdAt: new Date(),
    items: [
      {
        id: 'item-1',
        productId: 'product-1',
        quantity: 2,
        price: 10.99,
      },
    ],
    address: mockAddress,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: {
            product: {
              findMany: jest.fn(),
              update: jest.fn(),
            },
            address: {
              findUnique: jest.fn(),
            },
            order: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createOrderDto: CreateOrderDto = {
      items: [
        {
          productId: 'product-1',
          quantity: 2,
        },
      ],
      addressId: 'address-1',
    };

    it('should create an order successfully', async () => {
      prismaService.product.findMany.mockResolvedValue([mockProduct]);
      prismaService.address.findUnique.mockResolvedValue(mockAddress);

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const mockTx = {
          product: {
            update: jest.fn().mockResolvedValue(mockProduct),
          },
          order: {
            create: jest.fn().mockResolvedValue(mockOrder),
          },
        };
        return callback(mockTx);
      });
      prismaService.$transaction.mockImplementation(mockTransaction);

      const result = await service.create(createOrderDto, 'user-123');

      expect(result).toEqual(mockOrder);
      expect(prismaService.product.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['product-1'] } },
      });
      expect(prismaService.address.findUnique).toHaveBeenCalledWith({
        where: { id: 'address-1' },
      });
      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when address not found', async () => {
      prismaService.product.findMany.mockResolvedValue([mockProduct]);
      prismaService.address.findUnique.mockResolvedValue(null);

      await expect(service.create(createOrderDto, 'user-123')).rejects.toThrow(
        new NotFoundException('Address with ID "address-1" not found.'),
      );
    });

    it('should throw ForbiddenException when address does not belong to user', async () => {
      const differentUserAddress = { ...mockAddress, userId: 'other-user' };
      prismaService.product.findMany.mockResolvedValue([mockProduct]);
      prismaService.address.findUnique.mockResolvedValue(differentUserAddress);

      await expect(service.create(createOrderDto, 'user-123')).rejects.toThrow(
        new ForbiddenException(
          'This address does not belong to the current user.',
        ),
      );
    });

    it('should throw NotFoundException when products not found', async () => {
      prismaService.product.findMany.mockResolvedValue([]);
      prismaService.address.findUnique.mockResolvedValue(mockAddress);

      await expect(service.create(createOrderDto, 'user-123')).rejects.toThrow(
        new NotFoundException('Products with IDs "product-1" not found.'),
      );
    });

    it('should throw UnprocessableEntityException when insufficient stock', async () => {
      const lowStockProduct = { ...mockProduct, stockQuantity: 1 };
      prismaService.product.findMany.mockResolvedValue([lowStockProduct]);
      prismaService.address.findUnique.mockResolvedValue(mockAddress);

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const mockTx = {
          product: {
            update: jest.fn().mockResolvedValue(lowStockProduct),
          },
          order: {
            create: jest.fn().mockResolvedValue(mockOrder),
          },
        };
        return callback(mockTx);
      });
      prismaService.$transaction.mockImplementation(mockTransaction);

      await expect(service.create(createOrderDto, 'user-123')).rejects.toThrow(
        new UnprocessableEntityException(
          'Insufficient stock of item "Test Product"',
        ),
      );
    });
  });

  describe('canceledByUser', () => {
    it('should cancel order successfully when status is PENDING', async () => {
      const pendingOrder = { ...mockOrder, status: OrderStatus.PENDING };
      prismaService.order.findUnique.mockResolvedValue(pendingOrder);
      prismaService.order.update.mockResolvedValue({
        ...pendingOrder,
        status: OrderStatus.CANCELED,
      });

      const result = await service.canceledByUser('order-1', mockUser);

      expect(result.status).toBe(OrderStatus.CANCELED);
      expect(prismaService.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: OrderStatus.CANCELED },
      });
    });

    it('should cancel order successfully when status is PAID', async () => {
      const paidOrder = { ...mockOrder, status: OrderStatus.PAID };
      prismaService.order.findUnique.mockResolvedValue(paidOrder);
      prismaService.order.update.mockResolvedValue({
        ...paidOrder,
        status: OrderStatus.CANCELED,
      });

      const result = await service.canceledByUser('order-1', mockUser);

      expect(result.status).toBe(OrderStatus.CANCELED);
    });

    it('should throw NotFoundException when order not found', async () => {
      prismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.canceledByUser('order-1', mockUser)).rejects.toThrow(
        new NotFoundException(
          'Order with ID "order-1" not found or does not belong to the user.',
        ),
      );
    });

    it('should throw ForbiddenException when order cannot be canceled', async () => {
      const shippedOrder = { ...mockOrder, status: OrderStatus.SHIPPED };
      prismaService.order.findUnique.mockResolvedValue(shippedOrder);

      await expect(service.canceledByUser('order-1', mockUser)).rejects.toThrow(
        new ForbiddenException('Cannot cancel an order with status "SHIPPED".'),
      );
    });
  });

  describe('findAll', () => {
    const mockPaginatedResult = {
      data: [mockOrder],
      meta: {
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    };

    beforeEach(() => {
      (paginator.paginate as jest.Mock).mockResolvedValue(mockPaginatedResult);
    });

    it('should return orders for regular user', async () => {
      const filters: SearchOrdersDto = { page: 1, limit: 10 };

      const result = await service.findAll(filters, mockUser);

      expect(result).toEqual(mockPaginatedResult);
      expect(paginator.paginate).toHaveBeenCalledWith(
        prismaService.order,
        { page: 1, limit: 10 },
        expect.objectContaining({
          where: { userId: 'user-123' },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should return all orders for admin user', async () => {
      const filters: SearchOrdersDto = { page: 1, limit: 10 };

      const result = await service.findAll(filters, mockAdminUser);

      expect(result).toEqual(mockPaginatedResult);
      expect(paginator.paginate).toHaveBeenCalledWith(
        prismaService.order,
        { page: 1, limit: 10 },
        expect.objectContaining({
          where: {},
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should filter by specific user ID for admin', async () => {
      const filters: SearchOrdersDto = {
        page: 1,
        limit: 10,
        userId: 'specific-user',
      };

      await service.findAll(filters, mockAdminUser);

      expect(paginator.paginate).toHaveBeenCalledWith(
        prismaService.order,
        { page: 1, limit: 10 },
        expect.objectContaining({
          where: { userId: 'specific-user' },
        }),
      );
    });

    it('should filter by status', async () => {
      const filters: SearchOrdersDto = {
        page: 1,
        limit: 10,
        status: OrderStatus.PAID,
      };

      await service.findAll(filters, mockUser);

      expect(paginator.paginate).toHaveBeenCalledWith(
        prismaService.order,
        { page: 1, limit: 10 },
        expect.objectContaining({
          where: { userId: 'user-123', status: OrderStatus.PAID },
        }),
      );
    });

    it('should filter by date range', async () => {
      const minDate = new Date('2023-01-01');
      const maxDate = new Date('2023-12-31');
      const filters: SearchOrdersDto = { page: 1, limit: 10, minDate, maxDate };

      await service.findAll(filters, mockUser);

      expect(paginator.paginate).toHaveBeenCalledWith(
        prismaService.order,
        { page: 1, limit: 10 },
        expect.objectContaining({
          where: {
            userId: 'user-123',
            createdAt: { gte: minDate, lte: maxDate },
          },
        }),
      );
    });

    it('should use custom sorting', async () => {
      const filters: SearchOrdersDto = {
        page: 1,
        limit: 10,
        sortBy: 'total',
        sortOrder: 'asc',
      };

      await service.findAll(filters, mockUser);

      expect(paginator.paginate).toHaveBeenCalledWith(
        prismaService.order,
        { page: 1, limit: 10 },
        expect.objectContaining({
          orderBy: { total: 'asc' },
        }),
      );
    });

    it('should default to createdAt desc for invalid sortBy', async () => {
      const filters: SearchOrdersDto = {
        page: 1,
        limit: 10,
        sortBy: 'invalidField',
        sortOrder: 'asc',
      };

      await service.findAll(filters, mockUser);

      expect(paginator.paginate).toHaveBeenCalledWith(
        prismaService.order,
        { page: 1, limit: 10 },
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('findOneByUser', () => {
    it('should return order by user successfully', async () => {
      const orderWithItems = {
        ...mockOrder,
        items: [
          {
            ...mockOrder.items[0],
            product: mockProduct,
          },
        ],
      };
      prismaService.order.findUnique.mockResolvedValue(orderWithItems);

      const result = await service.findOneByUser('order-1', 'user-123');

      expect(result).toEqual(orderWithItems);
      expect(prismaService.order.findUnique).toHaveBeenCalledWith({
        where: { id: 'order-1', userId: 'user-123' },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException when order not found', async () => {
      prismaService.order.findUnique.mockResolvedValue(null);

      await expect(
        service.findOneByUser('order-1', 'user-123'),
      ).rejects.toThrow(
        new NotFoundException('Order with ID "order-1" not found.'),
      );
    });
  });

  describe('updateStatus', () => {
    const updateStatusDto: UpdateOrderStatusDto = {
      status: OrderStatus.PAID,
    };

    it('should update order status successfully', async () => {
      const pendingOrder = { ...mockOrder, status: OrderStatus.PENDING };
      const updatedOrder = { ...pendingOrder, status: OrderStatus.PAID };

      prismaService.order.findUnique.mockResolvedValue(pendingOrder);
      prismaService.order.update.mockResolvedValue(updatedOrder);

      const result = await service.updateStatus('order-1', updateStatusDto);

      expect(result).toEqual(updatedOrder);
      expect(prismaService.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: OrderStatus.PAID },
      });
    });

    it('should throw NotFoundException when order not found', async () => {
      prismaService.order.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('order-1', updateStatusDto),
      ).rejects.toThrow(
        new NotFoundException('Order with ID "order-1" not found.'),
      );
    });

    it('should throw UnprocessableEntityException for invalid status transition', async () => {
      const deliveredOrder = { ...mockOrder, status: OrderStatus.DELIVERED };
      prismaService.order.findUnique.mockResolvedValue(deliveredOrder);

      const invalidUpdateDto: UpdateOrderStatusDto = {
        status: OrderStatus.PENDING,
      };

      await expect(
        service.updateStatus('order-1', invalidUpdateDto),
      ).rejects.toThrow(
        new UnprocessableEntityException(
          'Cannot transition order status from DELIVERED to PENDING',
        ),
      );
    });

    it('should handle Prisma P2025 error during update', async () => {
      const pendingOrder = { ...mockOrder, status: OrderStatus.PENDING };
      prismaService.order.findUnique.mockResolvedValue(pendingOrder);

      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        { code: 'P2025', clientVersion: '5.0.0' },
      );
      prismaService.order.update.mockRejectedValue(prismaError);

      await expect(
        service.updateStatus('order-1', updateStatusDto),
      ).rejects.toThrow(
        new NotFoundException('Order with ID "order-1" not found.'),
      );
    });

    it('should rethrow unknown errors during update', async () => {
      const pendingOrder = { ...mockOrder, status: OrderStatus.PENDING };
      prismaService.order.findUnique.mockResolvedValue(pendingOrder);

      const unknownError = new Error('Unknown database error');
      prismaService.order.update.mockRejectedValue(unknownError);

      await expect(
        service.updateStatus('order-1', updateStatusDto),
      ).rejects.toThrow(unknownError);
    });
  });
});
