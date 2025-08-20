import { IsString, IsNumber, IsOptional, IsEnum, IsBoolean, IsArray, Min, IsObject } from 'class-validator';
import { ProductVariantStatus } from '../product-variant.entity';

export class CreateProductVariantDto {
  @IsNumber()
  product_id: number;

  @IsString()
  variant_name: string;

  @IsString()
  sku: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  original_price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock_quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  min_stock?: number;

  @IsOptional()
  @IsObject()
  variant_options?: Record<string, string>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @IsOptional()
  @IsEnum(ProductVariantStatus)
  status?: ProductVariantStatus;

  @IsOptional()
  @IsNumber()
  sort_order?: number;
}