import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtPayload } from 'src/auth/interfaces/jwtPayload.interface';
import { Roles } from 'src/auth/decorators/roles.decorator';

@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Post()
  create(
    @Body() createAddressDto: CreateAddressDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.addressesService.create(createAddressDto, user.sub);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.addressesService.findAll(user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.addressesService.findOne(id, user.sub);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAddressDto: UpdateAddressDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.addressesService.update(id, updateAddressDto, user.sub);
  }

  @Delete(':id/delete')
  @Roles('ADMIN', 'USER')
  disable(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.addressesService.disable(id, user.sub);
  }
}
