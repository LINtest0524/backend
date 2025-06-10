import { IsOptional, IsArray, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  email?: string;

  @IsOptional()
  status?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modules?: string[];
}
