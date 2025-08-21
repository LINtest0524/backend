import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested, IsNumber, IsDecimal } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateShippingRuleTemplateItemDto {
  @IsString()
  method: string;

  @IsNumber()
  base_fee: number;

  @IsNumber()
  free_shipping_threshold: number;

  @IsOptional()
  @IsNumber()
  sort_order?: number;
}

export class CreateShippingRuleTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsNumber()
  company_id?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateShippingRuleTemplateItemDto)
  items: CreateShippingRuleTemplateItemDto[];
}