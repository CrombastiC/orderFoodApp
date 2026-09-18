import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiProperty({ description: '收件人姓名' })
  @IsString()
  @MinLength(1, { message: '收件人姓名不能为空' })
  @MaxLength(20)
  receiverName: string;

  @ApiProperty({ description: '联系电话' })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string;

  @ApiProperty({ description: '省市区' })
  @IsString()
  @MinLength(1, { message: '省市区不能为空' })
  @MaxLength(100)
  region: string;

  @ApiProperty({ description: '详细地址' })
  @IsString()
  @MinLength(1, { message: '详细地址不能为空' })
  @MaxLength(200)
  detail: string;

  @ApiPropertyOptional({ description: '是否设为默认地址', default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto {
  @ApiPropertyOptional({ description: '收件人姓名' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  receiverName?: string;

  @ApiPropertyOptional({ description: '联系电话' })
  @IsOptional()
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone?: string;

  @ApiPropertyOptional({ description: '省市区' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  region?: string;

  @ApiPropertyOptional({ description: '详细地址' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  detail?: string;

  @ApiPropertyOptional({ description: '是否设为默认地址' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isDefault?: boolean;
}

export class AddressIdParamDto {
  @ApiProperty({ description: '地址 ID' })
  @IsString()
  @MinLength(1)
  id: string;
}

export class AddressListQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit = 20;
}
