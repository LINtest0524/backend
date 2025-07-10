import { IsOptional, IsString, IsIn, IsDateString } from 'class-validator';

export class ExportUserDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'BANNED'])
  status?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  blacklist?: string;

  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @IsOptional()
  @IsDateString()
  createdTo?: string;

  @IsOptional()
  @IsDateString()
  loginFrom?: string;

  @IsOptional()
  @IsDateString()
  loginTo?: string;

  @IsOptional()
  @IsIn(['csv', 'xlsx'])
  format?: 'csv' | 'xlsx';

  @IsOptional()
  @IsIn(['true', 'false'])
  excludeUserRole?: string;
}
