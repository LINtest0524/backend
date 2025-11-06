import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsDateString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  Length,
  IsUUID,
  IsNumber,
  Min,
  Max,
  IsInt,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { CommissionMethod } from '../enums/commission-method.enum';

export class CreatePlatformRefundRateDto {
  @IsString()
  @Length(1, 50)
  platformCode: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @Transform(({ value }) => parseFloat(value))
  refundPercent: number;
}

export class CreateFixedCostDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  feeDeposit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  feeWithdraw?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Transform(({ value }) => parseFloat(value))
  refundBudgetPercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Transform(({ value }) => parseFloat(value))
  promoBudgetPercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Transform(({ value }) => parseFloat(value))
  bonusBudgetPercent?: number;
}

export class CreateConditionGroupDto {
  // 門檻條件
  @IsOptional()
  @IsInt()
  @Min(0)
  minRegistrations?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minActiveMembers?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minValidBets?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  minNetRevenue?: number;

  @IsOptional()
  @IsBoolean()
  requireNegativeProfit?: boolean;

  // 結果設定
  @IsNumber()
  @Min(0)
  @Max(100)
  @Transform(({ value }) => parseFloat(value))
  sharePercent: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @Transform(({ value }) => parseFloat(value))
  agentRemitPercent: number;

  // 平台退水費率
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePlatformRefundRateDto)
  platformRefundRates?: CreatePlatformRefundRateDto[];

  // 固定費用
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateFixedCostDto)
  fixedCost?: CreateFixedCostDto;
}

export class CreateCommissionConditionDto {
  @IsString()
  @Length(1, 100)
  name: string;

  @IsNumber()
  @IsInt()
  @Transform(({ value }) => parseInt(value))
  agentId: number;

  @IsEnum(CommissionMethod)
  method: CommissionMethod;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateConditionGroupDto)
  groups: CreateConditionGroupDto[];
}