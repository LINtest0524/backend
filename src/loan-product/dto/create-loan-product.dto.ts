import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductType, InterestRule } from '../loan-product.entity';

export class CreateLoanProductDto {
  @IsEnum(ProductType)
  @Type(() => String)
  product_type: ProductType;

  @IsNotEmpty()
  @IsString()
  product_name: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  first_amount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  credit_period?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  open_rate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  setup_fee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  charge_rate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  weekly_profit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  morning_rate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  extension_days?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  max_advance_count?: number;

  @IsOptional()
  @IsString()
  advance_rule?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  installment_period?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  min_period?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  max_period?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  daily_profit?: number;

  @IsEnum(InterestRule)
  @Type(() => String)
  interest_rule: InterestRule;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  company_id: number;
}
