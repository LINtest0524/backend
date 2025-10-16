import { IsNotEmpty, IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';

export class CreateRewardDto {
  @IsNumber()
  @IsNotEmpty()
  event_id: number;

  @IsNumber()
  @Min(1)
  @Max(30)
  day_number: number; // 第幾天

  @IsString()
  @IsNotEmpty()
  reward_type: string; // 'points', 'cash', 'coupon'

  @IsNumber()
  @Min(0)
  reward_value: number;

  @IsOptional()
  @IsString()
  reward_description?: string;
}

export class BatchCreateRewardsDto {
  @IsNumber()
  @IsNotEmpty()
  event_id: number;

  rewards: CreateRewardDto[];
}