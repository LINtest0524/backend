import { IsNumber, IsString, Min } from 'class-validator';

export class PublicCouponDto {
  @IsNumber()
  templateId: number;

  @IsString()
  code: string;

  @IsNumber()
  @Min(1)
  usageLimit: number;
}