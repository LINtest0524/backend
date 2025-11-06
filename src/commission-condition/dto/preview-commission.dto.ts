import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PreviewCommissionDto {
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  registrations: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  activeMembers: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  validBets: number;

  @IsNumber()
  @Type(() => Number)
  netRevenue: number;

  @IsOptional()
  @IsString()
  period?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  agentId?: number;

  @IsOptional()
  @IsString()
  platformCode?: string;
}