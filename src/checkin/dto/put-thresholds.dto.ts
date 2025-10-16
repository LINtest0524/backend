import { IsArray, ValidateNested, IsInt, IsEnum, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { RewardType } from '../entities/checkin-day-reward.entity';

export class ThresholdRewardDto {
  @IsEnum(RewardType)
  rewardType: RewardType;

  @IsOptional()
  @IsInt()
  @Min(0)
  amount?: number;

  @IsOptional()
  metaJson?: any;
}

export class ThresholdDto {
  @IsInt()
  @Min(1)
  daysRequired: number;

  @ValidateNested()
  @Type(() => ThresholdRewardDto)
  reward: ThresholdRewardDto;
}

export class PutThresholdsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ThresholdDto)
  thresholds: ThresholdDto[];
}