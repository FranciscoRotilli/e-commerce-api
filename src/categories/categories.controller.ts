import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Public } from 'src/auth/decorators/public.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtPayload } from 'src/auth/interfaces/jwtPayload.interface';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @Roles('ADMIN')
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  @Public()
  findAll(@CurrentUser() user: JwtPayload | undefined) {
    return this.categoriesService.findAll(user);
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
