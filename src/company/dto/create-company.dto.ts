import { IsString, IsOptional, IsArray, IsObject, IsIn } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive'])
  status?: string = 'active';

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsArray()
  passwordModes?: string[] = ['OLD_PASSWORD'];

  @IsOptional()
  @IsArray()
  loginMethods?: string[] = ['USERNAME_PASSWORD', 'FACEBOOK'];

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