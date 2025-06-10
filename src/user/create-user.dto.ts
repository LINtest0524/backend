import { IsNotEmpty, IsOptional, IsArray, IsString } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  username: string;

  @IsNotEmpty()
  password: string;

  @IsOptional()
  email?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modules?: string[];
}
