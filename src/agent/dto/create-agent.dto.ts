import { IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateAgentDto {
  @IsInt() companyId: number;

  @IsInt() @Min(1) @Max(12) agentLevel: number;

  @IsOptional() @IsInt() parentAgentId?: number | null;

  @IsString() @IsNotEmpty() displayName: string;

  @IsOptional() @IsString() commissionConditionId?: string | null;

  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() telegram?: string;
  @IsOptional() @IsString() line?: string;
  @IsOptional() @IsString() skype?: string;
  @IsOptional() @IsString() qq?: string;

  @IsEnum(['active','inactive','pending'] as any)
  status: 'active' | 'inactive' | 'pending';

  @IsString() @IsNotEmpty() loginAccount: string;
  @IsString() @IsNotEmpty() password: string;

  @IsOptional() @IsString() note?: string;

  // 代理前台子域名
  @IsOptional() @IsString() frontendUrl?: string;

  // 預留（不要求）
  @IsOptional() @IsString() revenueShare?: string;
  @IsOptional() @IsString() rebateLevel?: string;
}