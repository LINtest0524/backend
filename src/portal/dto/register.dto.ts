export class RegisterDto {
  username: string;
  password: string;
  email?: string;
  agent_code?: string; // 代理商推廣代碼（可選）
}
