import { User } from '../user/user.entity';

export interface JwtUserPayload {
  userId: number
  username: string
  role: string
  companyId: number
}

// JWT 策略現在返回完整的 User 實體
export type JwtUser = User;
