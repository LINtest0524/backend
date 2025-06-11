import { IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateBlacklistDto {
  @IsOptional()
  @IsNumber()
  userId?: number;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  ip?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
