import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { UserRole } from 'generated/prisma';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtPayload } from 'src/auth/interfaces/jwtPayload.interface';
import { AddItemToCartDto } from './dto/add-item-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.USER)
  getUserCart(@CurrentUser() user: JwtPayload) {
    return this.cartService.getUserCart(user.sub);
  }

  @Post('items')
  @Roles(UserRole.ADMIN, UserRole.USER)
  addItemToCart(
    @Body() addItemDto: AddItemToCartDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.cartService.addItem(user.sub, addItemDto);
  }

  @Patch('items/:productId')
  @Roles(UserRole.ADMIN, UserRole.USER)
  updateItemQuantity(
    @Param('productId') productId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.cartService.updateItemQuantity(
      user.sub,
      productId,
      updateCartItemDto.quantity,
    );
  }

  @Delete('items/:productId')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeItemFromCart(
    @Param('productId') productId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.cartService.removeItem(user.sub, productId);
  }

  @Delete()
  @Roles(UserRole.ADMIN, UserRole.USER)
  @HttpCode(HttpStatus.NO_CONTENT)
  clearCart(@CurrentUser() user: JwtPayload) {
    return this.cartService.clearCart(user.sub);
  }
}
