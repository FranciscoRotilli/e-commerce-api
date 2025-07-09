import { IsEnum, IsNotEmpty } from 'class-validator';
import { ProductStatus } from 'generated/prisma';

export class UpdateProductStatusDto {
  @IsEnum(ProductStatus)
  @IsNotEmpty()
  status: ProductStatus;
}
