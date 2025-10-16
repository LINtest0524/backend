import { IsString, IsEnum, IsOptional, IsInt, IsBoolean, IsDateString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ActivityType } from '../entities/checkin-activity.entity';

export class CreateActivityDto {
  @IsString()
  title: string;

  @IsEnum(ActivityType)
  activityType: ActivityType;

  @IsOptional()
  @IsInt()
  @Min(1)
  days?: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsDateString()
  publishAt?: string;

  @IsBoolean()
  isEnabled: boolean;

  @IsOptional()
  @IsInt()
  companyId?: number;

  @IsOptional()
  configJson?: any;
}