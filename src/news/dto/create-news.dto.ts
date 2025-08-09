import { IsString, IsOptional, IsEnum, IsBoolean, IsInt, IsDateString } from 'class-validator';
import { NewsStatus, NewsCategory } from '../news.entity';

export class CreateNewsDto {
  @IsString()
  title: string;

  @IsString()
  summary: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsDateString()
  publish_date?: string;

  @IsOptional()
  @IsEnum(NewsStatus)
  status?: NewsStatus;

  @IsOptional()
  @IsEnum(NewsCategory)
  category?: NewsCategory;

  @IsOptional()
  @IsInt()
  sort?: number;

  @IsOptional()
  @IsBoolean()
  is_featured?: boolean;

  @IsInt()
  companyId: number;
}