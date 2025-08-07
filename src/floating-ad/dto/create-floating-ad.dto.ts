import { IsString, IsUrl, IsBoolean, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { FloatingAdStatus, FloatingAdPosition } from '../floating-ad.entity';

export class CreateFloatingAdDto {
  @IsString()
  title: string;

  @IsUrl()
  link_url: string;

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsBoolean()
  target_blank?: boolean;

  @IsOptional()
  @IsEnum(FloatingAdPosition)
  position?: FloatingAdPosition;

  @IsOptional()
  @IsEnum(FloatingAdStatus)
  status?: FloatingAdStatus;

  @IsOptional()
  @IsNumber()
  sort?: number;

  @IsOptional()
  company?: { id: number };
}