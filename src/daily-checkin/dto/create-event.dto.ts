import { IsNotEmpty, IsString, IsOptional, IsBoolean, IsDate, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEventDto {
  @IsNumber()
  @IsNotEmpty()
  company_id: number;

  @IsString()
  @IsNotEmpty()
  name: string; // 活動名稱

  @IsOptional()
  @IsString()
  description?: string; // 活動描述

  @IsDate()
  @Type(() => Date)
  start_date: Date; // 活動開始時間

  @IsDate()
  @Type(() => Date)
  end_date: Date; // 活動結束時間

  @IsNumber()
  @Min(1)
  @Max(30)
  total_days: number; // 總簽到天數

  @IsOptional()
  @IsBoolean()
  is_active?: boolean; // 是否啟用
}