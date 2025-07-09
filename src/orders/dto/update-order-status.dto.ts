import { IsEnum, IsNotEmpty } from 'class-validator';
import { OrderStatus } from 'generated/prisma';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  @IsNotEmpty()
  status: OrderStatus;
}
