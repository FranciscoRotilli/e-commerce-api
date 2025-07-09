import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtPayload } from 'src/auth/interfaces/jwtPayload.interface';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles('ADMIN', 'USER')
  create(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ordersService.create(createOrderDto, user.sub);
  }

  @Get()
  @Roles('ADMIN', 'USER')
  findAllByUser(
    @CurrentUser() user: JwtPayload,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.ordersService.findAllByUser(user.sub, paginationDto);
  }

  @Get(':id')
  @Roles('ADMIN', 'USER')
  findOneByUser(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.ordersService.findOneByUser(id, user.sub);
  }

  @Post(':id/cancel')
  @Roles('ADMIN', 'USER')
  @HttpCode(HttpStatus.OK)
  canceledByUser(
    @Param('id') orderId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ordersService.canceledByUser(orderId, user);
  }

  // Admin Exclusive Routes

  @Patch(':id/status')
  @Roles('ADMIN')
  updateStatus(
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, updateOrderStatusDto);
  }

  @Get('all/list')
  @Roles('ADMIN')
  findAllAdmin(@Query() paginationDto: PaginationDto) {
    return this.ordersService.findAllAdmin(paginationDto);
  }
}
