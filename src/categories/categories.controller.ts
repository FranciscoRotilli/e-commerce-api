import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Public } from 'src/auth/decorators/public.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtPayload } from 'src/auth/interfaces/jwtPayload.interface';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { ProductsService } from 'src/products/products.service';

@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly productsService: ProductsService,
  ) {}

  @Post()
  @Roles('ADMIN')
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  @Public()
  findAll(
    @CurrentUser() user: JwtPayload | undefined,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.categoriesService.findAll(user, paginationDto);
  }

  @Get('id/:id')
  @Public()
  findOneById(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload | undefined,
  ) {
    return this.categoriesService.findOneById(id, user);
  }

  @Get(':slug')
  @Public()
  findOneBySlug(
    @Param('slug') slug: string,
    @CurrentUser() user: JwtPayload | undefined,
  ) {
    return this.categoriesService.findOneBySlug(slug, user);
  }

  @Post(':id/status')
  @Roles('ADMIN')
  switchStatus(@Param('id') id: string) {
    return this.categoriesService.switchStatus(id);
  }
}
