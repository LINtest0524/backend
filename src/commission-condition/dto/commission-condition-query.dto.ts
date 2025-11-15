import { IsOptional, IsString, IsBoolean, IsUUID, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class CommissionConditionQueryDto {
  // 分潤比例範圍篩選
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  commissionPercentMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  commissionPercentMax?: number;

  // 代理分潤結算篩選
  @IsOptional()
  @IsString()
  settlementCycle?: string;

  // 分潤制度篩選
  @IsOptional()
  @IsString()
  systemType?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 50;
}