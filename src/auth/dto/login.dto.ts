import { IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'testuser1' })
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'your_password' })
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({ example: 'company-a', description: '公司代碼（可選）' })
  @IsOptional()
  company?: string;
}
