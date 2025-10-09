import { IsString, IsEnum, IsNumber, IsOptional, IsDate, IsBoolean, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCouponTemplateDto {
  @IsString()
  name: string;

  @IsEnum(['PUBLIC', 'BATCH'])
  type: 'PUBLIC' | 'BATCH';

  @IsEnum(['PERCENTAGE', 'FIXED'])
  discountType: 'PERCENTAGE' | 'FIXED';

  @IsNumber()
  @Min(0)
  discountValue: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minAmount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  maxDiscount?: number;

  @IsDate()
  @Type(() => Date)
  validFrom: Date;

  @IsDate()
  @Type(() => Date)
  validTo: Date;

  @IsNumber()
  @Min(1)
  @IsOptional()
  usageLimit?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}