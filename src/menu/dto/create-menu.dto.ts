import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum, IsUrl, MaxLength } from 'class-validator';
import { MenuDeviceType, MenuStatus } from '../menu.entity';

export class CreateMenuDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  url?: string;

  @IsOptional()
  @IsBoolean()
  target_blank?: boolean = false;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  icon?: string;

  @IsOptional()
  @IsNumber()
  sort_order?: number = 0;

  @IsOptional()
  @IsEnum(MenuDeviceType)
  device_type?: MenuDeviceType = MenuDeviceType.BOTH;

  @IsOptional()
  @IsEnum(MenuStatus)
  status?: MenuStatus = MenuStatus.ACTIVE;

  @IsOptional()
  @IsNumber()
  parent_id?: number;

  @IsNumber()
  company_id: number;
}