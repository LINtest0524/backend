import { IsNumber, IsEnum, IsArray, IsOptional, ArrayMinSize } from 'class-validator';

export class BatchCouponDto {
  @IsNumber()
  templateId: number;

  @IsEnum(['TAG_GROUP', 'ALL_USERS', 'SPECIFIC_USERS'])
  targetType: 'TAG_GROUP' | 'ALL_USERS' | 'SPECIFIC_USERS';

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  tagIds?: number[];

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  userIds?: number[];

  @IsNumber()
  @IsOptional()
  quantity?: number;
}