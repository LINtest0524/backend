import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateLogoDto {
  @IsString()
  title: string;

  @IsString()
  image_url: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}