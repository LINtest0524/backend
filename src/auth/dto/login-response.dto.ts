import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT token' })
  token: string;

  @ApiProperty({
    description: '使用者資訊',
    example: {
      userId: 1,
      username: 'testuser1',
      role: 'SUPER_ADMIN',
      companyId: null,
      company: null,
      enabledModules: { marquee: true, banner: true },
    },
  })
  user: {
    userId: number;
    username: string;
    role: string;
    companyId: number | null;
    company: any | null;
    enabledModules: Record<string, boolean>;
  };
}
