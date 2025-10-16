import { Injectable } from '@nestjs/common';

interface UserSession {
  userId: number;
  username: string;
  companyId: number;
  token: string;
  loginTime: number;
  lastActivity: number;
  deviceInfo?: string;
}

@Injectable()
export class SessionService {
  // 存儲用戶會話，key: userId, value: UserSession
  private activeSessions: Map<number, UserSession> = new Map();
  
  // 存儲 token 到 userId 的映射
  private tokenToUser: Map<string, number> = new Map();
  
  // 創建新會話（後者踢掉前者）
  createSession(userId: number, username: string, companyId: number, token: string, deviceInfo?: string): void {
    const tokenPrefix = token.substring(0, 6);
    const tokenSuffix = token.substring(token.length - 6);
    
    // 檢查是否有現有會話
    const existingSession = this.activeSessions.get(userId);
    if (existingSession) {
      // 移除舊 token 映射
      this.tokenToUser.delete(existingSession.token);
    }
    
    // 創建新會話
    const newSession: UserSession = {
      userId,
      username,
      companyId,
      token,
      loginTime: Date.now(),
      lastActivity: Date.now(),
      deviceInfo
    };
    
    // 存儲新會話
    this.activeSessions.set(userId, newSession);
    this.tokenToUser.set(token, userId);
  }
  
  // 驗證 token 是否有效
  validateToken(token: string): UserSession | null {
    const tokenPrefix = token.substring(0, 6);
    const tokenSuffix = token.substring(token.length - 6);
    const userId = this.tokenToUser.get(token);
    
    if (!userId) {
      return null;
    }
    
    const session = this.activeSessions.get(userId);
    if (!session) {
      this.tokenToUser.delete(token);
      return null;
    }
    
    if (session.token !== token) {
      this.tokenToUser.delete(token);
      return null;
    }
    
    // 更新最後活動時間 - 不再每次都輸出日誌
    session.lastActivity = Date.now();
    return session;
  }
  
  // 登出
  removeSession(token: string): boolean {
    const userId = this.tokenToUser.get(token);
    if (!userId) return false;
    
    const session = this.activeSessions.get(userId);
    if (session && session.token === token) {
      this.activeSessions.delete(userId);
      this.tokenToUser.delete(token);
      return true;
    }
    
    return false;
  }
  
  // 獲取活躍會話列表（用於管理）
  getActiveSessions(): UserSession[] {
    return Array.from(this.activeSessions.values());
  }
  
  // 清理過期會話
  cleanupExpiredSessions(): void {
    const now = Date.now();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    
    for (const [userId, session] of this.activeSessions.entries()) {
      // 清理7天沒有活動的會話
      if (now - session.lastActivity > SEVEN_DAYS) {
        this.activeSessions.delete(userId);
        this.tokenToUser.delete(session.token);
      }
    }
  }
  
  // 強制踢出用戶（管理功能）
  forceLogout(userId: number): boolean {
    const session = this.activeSessions.get(userId);
    if (session) {
      this.activeSessions.delete(userId);
      this.tokenToUser.delete(session.token);
      return true;
    }
    return false;
  }

  // 開發階段用：清除所有會話
  clearAllSessions(): void {
    this.activeSessions.clear();
    this.tokenToUser.clear();
  }
}