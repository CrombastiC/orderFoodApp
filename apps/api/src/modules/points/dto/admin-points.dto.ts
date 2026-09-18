import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePrizeDto {
  @ApiProperty({ description: '奖品名称' })
  @IsString()
  prizeName: string;

  @ApiProperty({ description: '奖品图片 URL' })
  @IsString()
  prizeImage: string;

  @ApiProperty({ description: '奖励积分，0 表示实物大奖' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  prizeIntegral: number;

  @ApiPropertyOptional({ description: '参考价值' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  prizeValue?: number;

  @ApiPropertyOptional({ description: '库存', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ description: '中奖权重（同类型奖品内部相对概率）', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  weight?: number;

  @ApiPropertyOptional({ description: '排序', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdatePrizeDto {
  @IsOptional()
  @IsString()
  prizeName?: string;

  @IsOptional()
  @IsString()
  prizeImage?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  prizeIntegral?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  prizeValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  weight?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateCommodityDto {
  @ApiProperty({ description: '商品名称' })
  @IsString()
  commodityName: string;

  @ApiProperty({ description: '商品图片 URL' })
  @IsString()
  commodityImage: string;

  @ApiProperty({ description: '兑换积分' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  commodityIntegral: number;

  @ApiPropertyOptional({ description: '库存', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ description: '排序', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateCommodityDto {
  @IsOptional()
  @IsString()
  commodityName?: string;

  @IsOptional()
  @IsString()
  commodityImage?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  commodityIntegral?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
