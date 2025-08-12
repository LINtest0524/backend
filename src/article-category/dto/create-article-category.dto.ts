import { IsString, IsOptional, IsEnum, IsInt } from 'class-validator';
import { CategoryStatus } from '../article-category.entity';

export class CreateArticleCategoryDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CategoryStatus)
  status?: CategoryStatus;

  @IsOptional()
  @IsInt()
  sort?: number;

  @IsInt()
  companyId: number;
}