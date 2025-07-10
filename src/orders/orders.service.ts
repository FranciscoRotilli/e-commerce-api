import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Decimal } from 'generated/prisma/runtime/library';
import { OrderStatus, Prisma } from 'generated/prisma';
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
    const { items, addressId } = createOrderDto;

    const productIds = items.map((item) => item.productId);

    const [productsInDb, address] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          id: { in: productIds },
        },
      }),
      this.prisma.address.findUnique({
        where: { id: addressId },
      }),
    ]);

    if (!address) {
      throw new NotFoundException(`Address with ID "${addressId}" not found.`);
    }
    if (address.userId !== userId) {
      throw new ForbiddenException(
        `This addres does not belong to the current user.`,
      );
    }

    if (productsInDb.length !== productIds.length) {
      const foundProductIds = productsInDb.map((p) => p.id);
      const notFoundIds = productIds.filter(
        (id) => !foundProductIds.includes(id),
      );
      throw new NotFoundException(
        `Products with IDs "${notFoundIds.join(', ')}" not found.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      let total = new Decimal(0);

      for (const item of items) {
        const product = productsInDb.find((p) => p.id === item.productId);

        if (!product) {
          throw new NotFoundException(
            `Product with ID "${item.productId}" not found.`,
          );
        }

        if (product.stockQuantity < item.quantity) {
          throw new UnprocessableEntityException(
            `Insufficient stock of item "${product.name}"`,
          );
        }

        await tx.product.update({
          where: { id: item.productId },
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
            create: items.map((item) => {
              const product = productsInDb.find(
                (p) => p.id === item.productId,
              )!;
              return {
                productId: item.productId,
                quantity: item.quantity,
                price: product.currentPrice,
              };
            }),
          },
        },
        include: {
          items: true,
          address: true,
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
    const cancelableStatuses: OrderStatus[] = ['PENDING', 'PAID'];
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
        status: 'CANCELED',
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

    if (user.role === 'ADMIN') {
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
