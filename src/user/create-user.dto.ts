import { IsArray, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsArray()
  @IsOptional()
  modules?: string[];
}
