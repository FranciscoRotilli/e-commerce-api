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
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Delete,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { AddCategoryDto } from './dto/add-category.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtPayload } from 'src/auth/interfaces/jwtPayload.interface';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { FilterProductsDto } from './dto/filter-product.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomBytes } from 'crypto';
import { extname } from 'path';
import { UserRole } from 'generated/prisma';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Public()
  @Get()
  findAll(
    @Query() filterDto: FilterProductsDto,
    @CurrentUser() user: JwtPayload | undefined,
  ) {
    return this.productsService.findAll(filterDto, user);
  }

  @Public()
  @Get(':id')
  findOneById(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload | undefined,
  ) {
    return this.productsService.findOneById(id, user);
  }

  @Public()
  @Get('slug/:slug')
  findOneBySlug(
    @Param('slug') slug: string,
    @CurrentUser() user: JwtPayload | undefined,
  ) {
    return this.productsService.findOneBySlug(slug, user);
  }

  // Admin Exclusive Routes

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  updateStatus(
    @Param('id') id: string,
    @Body() updateProductStatusDto: UpdateProductStatusDto,
  ) {
    return this.productsService.updateStatus(id, updateProductStatusDto);
  }

  @Post(':id/categories')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  addCategory(
    @Param('id') productId: string,
    @Body() addCategoryDto: AddCategoryDto,
  ) {
    return this.productsService.addCategory(productId, addCategoryDto);
  }

  @Post(':id/images')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FilesInterceptor('file', 5, {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix = randomBytes(16).toString('hex');
          const extension = extname(file.originalname);
          const filename = `${uniqueSuffix}${extension}`;
          callback(null, filename);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return callback(
            new BadRequestException('Only image files are allowed!'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  uploadImages(
    @Param('id') productId: string,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('You must upload at least one file.');
    }
    return this.productsService.addImages(productId, files);
  }

  @Delete('images/:imageId')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeImage(@Param('imageId') imageId: string) {
    return this.productsService.removeImage(imageId);
  }
}
