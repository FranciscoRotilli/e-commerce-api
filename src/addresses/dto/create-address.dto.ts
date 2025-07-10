import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { AddressType } from 'generated/prisma';
import { IsValidCep } from 'src/common/decorators/is-valid-cep.decorator';

export class CreateAddressDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(AddressType)
  @IsNotEmpty()
  type: AddressType;

  @IsString()
  @IsNotEmpty()
  street: string;

  @IsString()
  @IsNotEmpty()
  number: string;

  @IsString()
  @IsOptional()
  complement?: string;

  @IsString()
  @IsOptional()
  neighborhood?: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  @IsValidCep()
  zipCode: string;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}
