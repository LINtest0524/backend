import { IsNumber, IsString, IsArray, IsOptional, IsIn } from 'class-validator';

export class DistributeCouponDto {
  @IsNumber()
  templateId: number;

  @IsString()
  @IsIn(['ALL_USERS', 'TAG_GROUP', 'SPECIFIC_USERS'])
  targetType: 'ALL_USERS' | 'TAG_GROUP' | 'SPECIFIC_USERS';

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  tagIds?: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  userIds?: number[];

  @IsOptional()
  @IsNumber()
  quantity?: number;
}