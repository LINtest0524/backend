import { IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, IsArray } from 'class-validator';

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

  // 代理資料
  @IsOptional() @IsString() agentName?: string;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsString() idNumber?: string;

  // 預設設定
  @IsOptional() @IsString() defaultVipLevel?: string;
  @IsOptional() @IsString() defaultRebateSettlement?: string;
  @IsOptional() @IsString() defaultPaymentGroup?: string;

  // 帳號狀態
  @IsOptional() @IsArray() accountStatus?: string[];

  // 銀行卡資料
  @IsOptional() @IsArray() bankCards?: any[];

  // 禁止遊戲廠商
  @IsOptional() bannedGameProviders?: any;

  // 預留（不要求）
  @IsOptional() @IsString() revenueShare?: string;
  @IsOptional() @IsString() rebateLevel?: string;
}