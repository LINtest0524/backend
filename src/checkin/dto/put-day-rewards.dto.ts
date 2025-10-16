import { IsArray, ValidateNested, IsInt, IsEnum, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { RewardType } from '../entities/checkin-day-reward.entity';

export class DayRewardDto {
  @IsInt()
  @Min(1)
  dayIndex: number;

  @IsEnum(RewardType)
  rewardType: RewardType;

  @IsOptional()
  @IsInt()
  @Min(0)
  amount?: number;

  @IsOptional()
  metaJson?: any;
}

export class PutDayRewardsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DayRewardDto)
  dayRewards: DayRewardDto[];
}