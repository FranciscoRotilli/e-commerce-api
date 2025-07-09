import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { JwtPayload } from 'src/auth/interfaces/jwtPayload.interface';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

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
  findAllByUser(@CurrentUser() user: JwtPayload) {
    return this.ordersService.findAllByUser(user.sub);
  }

  @Get(':id')
  @Roles('ADMIN', 'USER')
  findOneByUser(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.ordersService.findOneByUser(id, user.sub);
  }

  // Admin Exclusive Routes

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(id, updateOrderDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }

  @Get('all/list')
  @Roles('ADMIN')
  findAllAdmin(@Query() paginationDto: PaginationDto) {
    return this.ordersService.findAllAdmin(paginationDto);
  }
}
