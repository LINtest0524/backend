import { IsOptional, IsArray, IsString, IsBoolean } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  email?: string;

  @IsOptional()
  status?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modules?: string[];

  @IsOptional()
  @IsBoolean()
  is_blacklisted?: boolean; // ✅ 加這行解決紅線
}
