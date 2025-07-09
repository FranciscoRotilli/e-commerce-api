import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { AddCategoryDto } from './dto/add-category.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtPayload } from 'src/auth/interfaces/jwtPayload.interface';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles('ADMIN')
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Public()
  @Get()
  findAll(
    @Query() paginationDto: PaginationDto,
    @CurrentUser() user: JwtPayload | undefined,
  ) {
    return this.productsService.findAll(paginationDto, user);
  }

  @Public()
  @Get('id/:id')
  findOneById(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload | undefined,
  ) {
    return this.productsService.findOneById(id, user);
  }

  @Public()
  @Get(':slug')
  findOneBySlug(
    @Param('slug') slug: string,
    @CurrentUser() user: JwtPayload | undefined,
  ) {
    return this.productsService.findOneBySlug(slug, user);
  }

  @Patch('id/:id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Patch('id/:id/status')
  @Roles('ADMIN')
  remove(
    @Param('id') id: string,
    @Body() updateProductStatusDto: UpdateProductStatusDto,
  ) {
    return this.productsService.updateStatus(id, updateProductStatusDto);
  }

  @Post('id/:id/categories')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  addCategory(
    @Param('id') productId: string,
    @Body() addCategoryDto: AddCategoryDto,
  ) {
    return this.productsService.addCategory(productId, addCategoryDto);
  }
}
