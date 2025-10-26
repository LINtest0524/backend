import { IsString, IsOptional, IsArray, IsObject, IsIn } from 'class-validator';

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive'])
  status?: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsArray()
  passwordModes?: string[];

  @IsOptional()
  @IsArray()
  loginMethods?: string[];

  @IsOptional()
  @IsObject()
  settings?: {
    theme?: string;
    features?: string[];
    branding?: {
      primaryColor?: string;
      secondaryColor?: string;
      logo?: string;
    };
    [key: string]: any;
  };
}