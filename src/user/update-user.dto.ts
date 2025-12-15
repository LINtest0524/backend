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
  is_blacklisted?: boolean; //   加這行解決紅線

  @IsOptional()
  @IsString()
  ip_whitelist?: string; //   IP白名單欄位

  @IsOptional()
  @IsString()
  department_type?: string; //   部門類型欄位

  @IsOptional()
  @IsString()
  agent_code?: string; //   代理商推廣代碼欄位

  // 代理商擴展欄位
  @IsOptional()
  @IsString()
  agentName?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  idNumber?: string;

  @IsOptional()
  @IsString()
  frontendUrl?: string;

  // 預設設定
  @IsOptional()
  @IsString()
  defaultVipLevel?: string;

  @IsOptional()
  @IsString()
  defaultRebateSettlement?: string;

  @IsOptional()
  @IsString()
  defaultPaymentGroup?: string;

  // 帳號狀態
  @IsOptional()
  @IsArray()
  accountStatus?: string[];

  // 銀行卡和遊戲廠商
  @IsOptional()
  bankCards?: any[];

  @IsOptional()
  bannedGameProviders?: any;
}
