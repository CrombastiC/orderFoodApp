import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AddressService } from './address.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

@ApiTags('地址')
@ApiBearerAuth('JWT-auth')
@Controller('address')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Get('list')
  @ApiOperation({ summary: '获取我的地址列表' })
  async getAddressList(@CurrentUser('id') userId: string) {
    return this.addressService.getAddressList(userId);
  }

  @Post('create')
  @ApiOperation({ summary: '新增地址' })
  async createAddress(@CurrentUser('id') userId: string, @Body() dto: CreateAddressDto) {
    return this.addressService.createAddress(userId, dto);
  }

  @Put('update/:id')
  @ApiOperation({ summary: '更新地址' })
  async updateAddress(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressService.updateAddress(userId, id, dto);
  }

  @Delete('delete/:id')
  @ApiOperation({ summary: '删除地址' })
  async deleteAddress(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.addressService.deleteAddress(userId, id);
  }

  @Put('default/:id')
  @ApiOperation({ summary: '设为默认地址' })
  async setDefaultAddress(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.addressService.setDefaultAddress(userId, id);
  }
}
