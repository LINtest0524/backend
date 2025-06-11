import { IsOptional, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsOptional()
  @IsString()
  oldPassword?: string;

  @IsOptional()
  @IsString()
  emailCode?: string;

  @IsOptional()
  @IsString()
  smsCode?: string;

  @IsString()
  @MinLength(6, { message: 'New password must be at least 6 characters long' })
  newPassword: string;
}
