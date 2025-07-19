import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { OrderStatus, Prisma, UserRole } from 'generated/prisma';
import { JwtPayload } from 'src/auth/interfaces/jwtPayload.interface';
import { paginate } from 'src/common/utils/paginator';
import { SearchOrdersDto } from './dto/search-order.dto';

const validTransitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PAID', 'CANCELED'],
  PAID: ['SHIPPED', 'CANCELED'],
  SHIPPED: ['DELIVERED', 'CANCELED'],
  DELIVERED: ['RETURNED'],
  CANCELED: [],
  RETURNED: [],
};

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createOrderDto: CreateOrderDto, userId: string) {
    const { addressId } = createOrderDto;

    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
    if (!cart || cart.items.length === 0) {
      throw new UnprocessableEntityException('Your cart is empty.');
    }

    const address = await this.prisma.address.findUnique({
      where: { id: addressId },
    });
    if (!address || address.userId !== userId) {
      throw new ForbiddenException(
        'This address does not belong to the current user.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      let total = new Decimal(0);

      for (const item of cart.items) {
        const product = item.product;

        if (product.stockQuantity < item.quantity) {
          throw new UnprocessableEntityException(
            `Insufficient stock for product "${product.name}". Only ${product.stockQuantity} available.`,
          );
        }

        await tx.product.update({
          where: { id: product.id },
          data: {
            stockQuantity: {
              decrement: item.quantity,
            },
          },
        });

        const itemTotal = new Decimal(product.currentPrice).mul(item.quantity);
        total = total.add(itemTotal);
      }

      const order = await tx.order.create({
        data: {
          userId: userId,
          addressId: addressId,
          total: total,
          status: OrderStatus.PENDING,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.product.currentPrice,
            })),
          },
        },
        include: {
          items: true,
          address: true,
        },
      });

      await tx.cartItem.deleteMany({
        where: {
          cartId: cart.id,
        },
      });
      return order;
    });
  }

  async canceledByUser(orderId: string, userPayload: JwtPayload) {
    const order = await this.prisma.order.findUnique({
      where: {
        id: orderId,
        userId: userPayload.sub,
      },
    });
    if (!order) {
      throw new NotFoundException(
        `Order with ID "${orderId}" not found or does not belong to the user.`,
      );
    }
    const currentStatus = order.status;
    const cancelableStatuses: OrderStatus[] = [
      OrderStatus.PENDING,
      OrderStatus.PAID,
    ];
    if (!cancelableStatuses.includes(currentStatus)) {
      throw new ForbiddenException(
        `Cannot cancel an order with status "${currentStatus}".`,
      );
    }
    return this.prisma.order.update({
      where: {
        id: orderId,
      },
      data: {
        status: OrderStatus.CANCELED,
      },
    });
  }

  async findAll(filters: SearchOrdersDto, user: JwtPayload) {
    const {
      page,
      limit,
      search,
      status,
      minDate,
      maxDate,
      sortBy,
      sortOrder,
      userId,
    } = filters;

    const whereClause: Prisma.OrderWhereInput = {};

    if (user.role === UserRole.ADMIN) {
      if (userId) {
        whereClause.userId = userId;
      }
    } else {
      whereClause.userId = user.sub;
    }

    if (search) whereClause.id = { contains: search, mode: 'insensitive' };
    if (status) whereClause.status = status;
    if (minDate || maxDate) {
      whereClause.createdAt = {};
      if (minDate) whereClause.createdAt.gte = minDate;
      if (maxDate) whereClause.createdAt.lte = maxDate;
    }

    const orderByClause: Prisma.OrderOrderByWithRelationInput = {};
    const allowedSortBy = ['createdAt', 'total', 'status'];
    if (sortBy && allowedSortBy.includes(sortBy)) {
      orderByClause[sortBy] = sortOrder ?? 'desc';
    } else {
      orderByClause.createdAt = 'desc';
    }

    return await paginate(
      this.prisma.order,
      { page, limit },
      {
        where: whereClause,
        orderBy: orderByClause,
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: true,
        },
      },
    );
  }

  async findOneByUser(id: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id, userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found.`);
    }
    return order;
  }

  async updateStatus(id: string, updateStatus: UpdateOrderStatusDto) {
    const { status: newStatus } = updateStatus;
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found.`);
    }
    const currentStatus = order.status;
    const allowedTransitions = validTransitions[currentStatus];
    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      throw new UnprocessableEntityException(
        `Cannot transition order status from ${currentStatus} to ${newStatus}`,
      );
    }
    try {
      return await this.prisma.order.update({
        where: { id },
        data: {
          status: newStatus,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Order with ID "${id}" not found.`);
      }
      throw error;
    }
  }
}
