import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddItemToCartDto } from './dto/add-item-to-cart.dto';
import { Decimal } from 'generated/prisma/runtime/library';
import { Prisma, ProductStatus } from 'generated/prisma';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserCart(
    userId: string,
    prismaClient: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const cart = await prismaClient.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                currentPrice: true,
                slug: true,
                images: {
                  take: 1,
                  select: {
                    url: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      return {
        id: null,
        userId: userId,
        items: [],
        totalItems: 0,
        totalPrice: 0,
      };
    }

    const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.items.reduce((sum, item) => {
      const itemTotal = new Decimal(item.product.currentPrice).mul(
        item.quantity,
      );
      return sum.add(itemTotal);
    }, new Decimal(0));

    return {
      ...cart,
      totalItems,
      totalPrice,
    };
  }

  async addItem(userId: string, addItemDto: AddItemToCartDto) {
    const { productId, quantity } = addItemDto;

    return this.prisma.$transaction(async (tx) => {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException(
          `Product with ID "${productId}" not found.`,
        );
      }
      if (product.status !== ProductStatus.ACTIVE) {
        throw new UnprocessableEntityException(
          `Product "${product.name}" is not available for purchase.`,
        );
      }
      if (product.stockQuantity < quantity) {
        throw new UnprocessableEntityException(
          `Insufficient stock for product "${product.name}". Only ${product.stockQuantity} available.`,
        );
      }
      const cart = await tx.cart.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });

      await tx.cartItem.upsert({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId: productId,
          },
        },
        create: {
          cartId: cart.id,
          productId: productId,
          quantity: quantity,
        },
        update: {
          quantity: {
            increment: quantity,
          },
        },
      });
      return this.getUserCart(userId, tx);
    });
  }

  async updateItemQuantity(
    userId: string,
    productId: string,
    quantity: number,
  ) {
    if (quantity === 0) {
      await this.removeItem(userId, productId);
      return this.getUserCart(userId);
    }

    return this.prisma.$transaction(async (tx) => {
      const cart = await this.prisma.cart.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!cart) {
        throw new NotFoundException('User does not have a cart.');
      }

      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        select: { stockQuantity: true, name: true },
      });

      if (!product) {
        throw new NotFoundException(
          `Product with ID "${productId}" not found.`,
        );
      }

      if (product.stockQuantity < quantity) {
        throw new UnprocessableEntityException(
          `Insufficient stock for product "${product.name}". Only ${product.stockQuantity} available.`,
        );
      }

      const cartItemExists = await this.prisma.cartItem.findUnique({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId: productId,
          },
        },
      });

      if (!cartItemExists) {
        throw new NotFoundException(
          `Product with ID "${productId}" not found in cart.`,
        );
      }

      await tx.cartItem.update({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId: productId,
          },
        },
        data: {
          quantity: quantity,
        },
      });
      return this.getUserCart(userId, tx);
    });
  }

  async removeItem(userId: string, productId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!cart) {
      return;
    }

    try {
      await this.prisma.cartItem.delete({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId: productId,
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return;
      }
      throw error;
    }
  }

  async clearCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!cart) {
      return;
    }

    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return;
  }
}
