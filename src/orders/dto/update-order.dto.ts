import { IsEnum, IsNotEmpty } from 'class-validator';
import { OrderStatus } from 'generated/prisma';

export class UpdateOrderDto {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  @IsEnum(OrderStatus)
  @IsNotEmpty()
  status: OrderStatus;
}
