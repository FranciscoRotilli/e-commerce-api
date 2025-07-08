import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Decimal } from 'generated/prisma/runtime/library';
import { OrderStatus, Prisma } from 'generated/prisma';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createOrderDto: CreateOrderDto, userId: string) {
    const { items } = createOrderDto;
    const productIds = items.map((item) => item.productId);
    const productsInDb = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
    });
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
        },
      });
      return order;
    });
  }

  findAllByUser(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: { name: true, slug: true },
            },
          },
        },
      },
    });
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
  }

  async update(id: string, updateOrderDto: UpdateOrderDto) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });
    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found.`);
    }
    try {
      return await this.prisma.order.update({
        where: { id },
        data: {
          status: updateOrderDto.status,
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

  async remove(id: string) {
    try {
      await this.prisma.order.delete({
        where: { id },
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

  async findAllAdmin(paginationDto: PaginationDto) {
    const { page, limit } = paginationDto;
    if (page && limit) {
      return this.prisma.order.findMany({
        take: limit,
        skip: (page - 1) * limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }
    return null;
  }
}
