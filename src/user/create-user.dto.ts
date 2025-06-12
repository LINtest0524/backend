import {
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsString,
  IsEnum,
  IsNumber,
  IsEmail,
} from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsEnum(['SUPER_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT', 'USER'])
  role: string;

  @IsNumber()
  companyId: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modules?: string[];
}
