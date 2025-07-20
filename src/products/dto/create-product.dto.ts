import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsNumber()
  @Min(10)
  stockQuantity: number;

  @IsNumber()
  @IsPositive()
  oldPrice: number;

  @IsNumber()
  @IsPositive()
  currentPrice: number;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @IsOptional()
  slug: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags: string[];
}
