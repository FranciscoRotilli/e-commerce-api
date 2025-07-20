import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { SearchOrdersDto } from './dto/search-order.dto';
import { JwtPayload } from 'src/auth/interfaces/jwtPayload.interface';
import { OrderStatus, UserRole } from 'generated/prisma';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('OrdersController', () => {
  let controller: OrdersController;

  const mockOrdersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOneByUser: jest.fn(),
    canceledByUser: jest.fn(),
    updateStatus: jest.fn(),
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

  const mockOrder = {
    id: 'order-id-123',
    userId: 'user-id-123',
    addressId: 'address-id-123',
    total: 100.5,
    status: OrderStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      {
        id: 'item-id-123',
        productId: 'product-id-123',
        quantity: 2,
        price: 50.25,
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createOrderDto: CreateOrderDto = {
      addressId: 'address-id-123',
    };

    it('should create a new order', async () => {
      mockOrdersService.create.mockResolvedValue(mockOrder);

      const result = await controller.create(createOrderDto, mockUser);

      expect(mockOrdersService.create).toHaveBeenCalledWith(
        createOrderDto,
        mockUser.sub,
      );
      expect(result).toEqual(mockOrder);
    });

    it('should handle service errors during order creation', async () => {
      const error = new NotFoundException('Product not found');
      mockOrdersService.create.mockRejectedValue(error);

      await expect(controller.create(createOrderDto, mockUser)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockOrdersService.create).toHaveBeenCalledWith(
        createOrderDto,
        mockUser.sub,
      );
    });
  });

  describe('findAll', () => {
    const searchOrdersDto: SearchOrdersDto = {
      page: 1,
      limit: 10,
      status: OrderStatus.PENDING,
    };

    const mockPaginatedOrders = {
      data: [mockOrder],
      meta: {
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    };

    it('should return paginated orders for user', async () => {
      mockOrdersService.findAll.mockResolvedValue(mockPaginatedOrders);

      const result = await controller.findAll(mockUser, searchOrdersDto);

      expect(mockOrdersService.findAll).toHaveBeenCalledWith(
        searchOrdersDto,
        mockUser,
      );
      expect(result).toEqual(mockPaginatedOrders);
    });

    it('should return paginated orders for admin', async () => {
      mockOrdersService.findAll.mockResolvedValue(mockPaginatedOrders);

      const result = await controller.findAll(mockAdminUser, searchOrdersDto);

      expect(mockOrdersService.findAll).toHaveBeenCalledWith(
        searchOrdersDto,
        mockAdminUser,
      );
      expect(result).toEqual(mockPaginatedOrders);
    });
  });

  describe('findOneByUser', () => {
    const orderId = 'order-id-123';

    it('should return a specific order for the user', async () => {
      mockOrdersService.findOneByUser.mockResolvedValue(mockOrder);

      const result = await controller.findOneByUser(orderId, mockUser);

      expect(mockOrdersService.findOneByUser).toHaveBeenCalledWith(
        orderId,
        mockUser.sub,
      );
      expect(result).toEqual(mockOrder);
    });

    it('should handle order not found', async () => {
      const error = new NotFoundException('Order not found');
      mockOrdersService.findOneByUser.mockRejectedValue(error);

      await expect(controller.findOneByUser(orderId, mockUser)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockOrdersService.findOneByUser).toHaveBeenCalledWith(
        orderId,
        mockUser.sub,
      );
    });
  });

  describe('canceledByUser', () => {
    const orderId = 'order-id-123';

    it('should cancel an order successfully', async () => {
      const canceledOrder = { ...mockOrder, status: OrderStatus.CANCELED };
      mockOrdersService.canceledByUser.mockResolvedValue(canceledOrder);

      const result = await controller.canceledByUser(orderId, mockUser);

      expect(mockOrdersService.canceledByUser).toHaveBeenCalledWith(
        orderId,
        mockUser,
      );
      expect(result).toEqual(canceledOrder);
    });

    it('should handle order not found during cancellation', async () => {
      const error = new NotFoundException(
        'Order with ID "order-id-123" not found or does not belong to the user.',
      );
      mockOrdersService.canceledByUser.mockRejectedValue(error);

      await expect(
        controller.canceledByUser(orderId, mockUser),
      ).rejects.toThrow(NotFoundException);
      expect(mockOrdersService.canceledByUser).toHaveBeenCalledWith(
        orderId,
        mockUser,
      );
    });

    it('should handle forbidden cancellation', async () => {
      const error = new ForbiddenException(
        'Cannot cancel an order with status "DELIVERED".',
      );
      mockOrdersService.canceledByUser.mockRejectedValue(error);

      await expect(
        controller.canceledByUser(orderId, mockUser),
      ).rejects.toThrow(ForbiddenException);
      expect(mockOrdersService.canceledByUser).toHaveBeenCalledWith(
        orderId,
        mockUser,
      );
    });
  });

  describe('updateStatus', () => {
    const orderId = 'order-id-123';
    const updateOrderStatusDto: UpdateOrderStatusDto = {
      status: OrderStatus.SHIPPED,
    };

    it('should update order status successfully', async () => {
      const updatedOrder = { ...mockOrder, status: OrderStatus.SHIPPED };
      mockOrdersService.updateStatus.mockResolvedValue(updatedOrder);

      const result = await controller.updateStatus(
        orderId,
        updateOrderStatusDto,
      );

      expect(mockOrdersService.updateStatus).toHaveBeenCalledWith(
        orderId,
        updateOrderStatusDto,
      );
      expect(result).toEqual(updatedOrder);
    });

    it('should handle order not found during status update', async () => {
      const error = new NotFoundException(
        'Order with ID "order-id-123" not found.',
      );
      mockOrdersService.updateStatus.mockRejectedValue(error);

      await expect(
        controller.updateStatus(orderId, updateOrderStatusDto),
      ).rejects.toThrow(NotFoundException);
      expect(mockOrdersService.updateStatus).toHaveBeenCalledWith(
        orderId,
        updateOrderStatusDto,
      );
    });

    it('should handle invalid status transition', async () => {
      const error = new Error(
        'Cannot transition order status from DELIVERED to PENDING',
      );
      mockOrdersService.updateStatus.mockRejectedValue(error);

      await expect(
        controller.updateStatus(orderId, updateOrderStatusDto),
      ).rejects.toThrow(Error);
      expect(mockOrdersService.updateStatus).toHaveBeenCalledWith(
        orderId,
        updateOrderStatusDto,
      );
    });
  });
});
