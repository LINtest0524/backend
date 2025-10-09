import { IsString, IsNumber, Min, IsOptional } from 'class-validator';

export class ValidateCouponDto {
  @IsString()
  code: string;

  @IsNumber()
  @Min(0)
  amount: number;
}

export class UseCouponDto {
  @IsString()
  code: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsNumber()
  @IsOptional()
  orderId?: number;
}