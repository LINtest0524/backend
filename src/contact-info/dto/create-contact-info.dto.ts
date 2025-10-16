import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class CreateContactInfoDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  link?: string;

  @IsOptional()
  @IsBoolean()
  targetBlank?: boolean;

  @IsOptional()
  @IsString()
  qrCode?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsString()
  status?: string;
}