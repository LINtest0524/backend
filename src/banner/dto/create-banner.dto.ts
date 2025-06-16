import { IsString, IsEnum, IsInt, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BannerStatus } from '../banner.entity';

class CompanyIdDto {
  @IsInt()
  id: number;
}

export class CreateBannerDto {
  @IsString()
  title: string;

  @IsString()
  desktop_image_url: string;

  @IsString()
  mobile_image_url: string;

  @IsDateString()
  start_time: string;

  @IsDateString()
  end_time: string;

  @IsInt()
  sort: number;

  @IsEnum(BannerStatus)
  status: BannerStatus;

  @ValidateNested()
  @Type(() => CompanyIdDto)
  company: CompanyIdDto;
}
