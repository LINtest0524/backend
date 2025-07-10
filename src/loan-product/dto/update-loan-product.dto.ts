import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InterestRule } from '../loan-product.entity';

export class UpdateLoanProductDto {
  @IsOptional()
  @IsString()
  product_name?: string;

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

  @IsOptional()
  @IsEnum(InterestRule)
  interest_rule?: InterestRule;

  @IsOptional()
  @IsString()
  status?: string;
}
