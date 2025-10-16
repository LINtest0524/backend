import { IsNotEmpty, IsNumber, IsString, IsOptional, IsBoolean, Min, Max, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCheckinConfigDto {
  @IsNumber()
  @IsNotEmpty()
  company_id: number;

  @IsNumber()
  @Min(1)
  @Max(30) // 最多30天
  day_number: number;

  @IsString()
  @IsNotEmpty()
  reward_type: string; // 'points', 'cash', 'coupon'

  @IsNumber()
  @Min(0)
  reward_value: number;

  @IsOptional()
  @IsString()
  reward_description?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsString()
  activity_name?: string; // 活動名稱

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  start_date?: Date; // 活動開始時間

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  end_date?: Date; // 活動結束時間
}