import { IsString, IsOptional, IsNumber, IsEnum, IsDateString } from 'class-validator'

export class CreatePopupAnnouncementDto {
  @IsString()
  title: string

  @IsOptional()
  @IsString()
  desktop_image_url?: string

  @IsOptional()
  @IsString()
  mobile_image_url?: string

  @IsOptional()
  @IsString()
  button_text?: string

  @IsOptional()
  @IsString()
  button_url?: string

  @IsOptional()
  @IsNumber()
  sort_order?: number

  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: string

  @IsOptional()
  @IsDateString()
  start_date?: string

  @IsOptional()
  @IsDateString()
  end_date?: string

  @IsString()
  company_code: string
}