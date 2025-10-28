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
  
  private hasChanges = false;
  
  constructor() {
    console.log('🚀 SessionService starting up...');
    
    // 服務啟動時從持久化存儲加載會話（如果存在）
    this.loadSessionsFromStorage();
    
    // 定期保存會話到持久化存儲（僅當有變更時）
    setInterval(() => {
      if (this.hasChanges) {
        console.log('💾 Saving sessions to storage due to changes...');
        this.saveSessionsToStorage();
        this.hasChanges = false;
      }
    }, 60000); // 改為每60秒檢查一次，減少頻率
  }
  
  // 創建新會話（後者踢掉前者）
  createSession(userId: number, username: string, companyId: number, token: string, deviceInfo?: string): void {
    const tokenPrefix = token.substring(0, 6);
    const tokenSuffix = token.substring(token.length - 6);
    
    console.log(`🔄 Creating session for user ${userId} (${username}), token: ${tokenPrefix}...${tokenSuffix}`);
    
    // 檢查是否有現有會話
    const existingSession = this.activeSessions.get(userId);
    if (existingSession) {
      // 移除舊 token 映射
      this.tokenToUser.delete(existingSession.token);
      console.log(`🗑️ Removed old token mapping for user ${userId}`);
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
    this.hasChanges = true;
    
    console.log(`✅ Session created successfully. Total mappings: ${this.tokenToUser.size}, User ${userId} mapped to token ${tokenPrefix}...${tokenSuffix}`);
  }
  
  // 驗證 token 是否有效
  validateToken(token: string): UserSession | null {
    const tokenPrefix = token.substring(0, 6);
    const tokenSuffix = token.substring(token.length - 6);
    const userId = this.tokenToUser.get(token);
    
    if (!userId) {
      console.log(`❌ Token not found in mapping: ${tokenPrefix}...${tokenSuffix}, total mappings: ${this.tokenToUser.size}`);
      console.log(`🔍 Current token mappings:`);
      Array.from(this.tokenToUser.entries()).forEach(([tok, uid], index) => {
        const tokPrefix = tok.substring(0, 6);
        const tokSuffix = tok.substring(tok.length - 6);
        console.log(`   ${index + 1}. User ${uid}: ${tokPrefix}...${tokSuffix}`);
      });
      console.log(`💡 請重新登入以創建新的會話映射`);
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
      this.hasChanges = true;
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
        this.hasChanges = true;
      }
    }
  }
  
  // 強制踢出用戶（管理功能）
  forceLogout(userId: number): boolean {
    const session = this.activeSessions.get(userId);
    if (session) {
      this.activeSessions.delete(userId);
      this.tokenToUser.delete(session.token);
      this.hasChanges = true;
      return true;
    }
    return false;
  }

  // 開發階段用：清除所有會話
  clearAllSessions(): void {
    this.activeSessions.clear();
    this.tokenToUser.clear();
    this.saveSessionsToStorage(); // 清除時也要保存
  }
  
  // 保存會話到文件（非同步，避免阻塞）
  private saveSessionsToStorage(): void {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const sessionsData = {
        activeSessions: Array.from(this.activeSessions.entries()),
        tokenToUser: Array.from(this.tokenToUser.entries()),
        timestamp: Date.now()
      };
      
      const filePath = path.join(process.cwd(), 'sessions-backup.json');
      
      // 使用非同步寫入，避免阻塞主程序
      fs.writeFile(filePath, JSON.stringify(sessionsData, null, 2), (error) => {
        if (error) {
          console.warn('Failed to save sessions to storage:', error.message);
        }
      });
    } catch (error) {
      // 靜默處理存儲錯誤，不影響主要功能
      console.warn('Failed to save sessions to storage:', error.message);
    }
  }
  
  // 從文件載入會話
  private loadSessionsFromStorage(): void {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const filePath = path.join(process.cwd(), 'sessions-backup.json');
      
      if (!fs.existsSync(filePath)) {
        console.log('📂 No session backup file found, starting with empty sessions');
        return; // 文件不存在，跳過
      }
      
      const data = fs.readFileSync(filePath, 'utf8');
      const sessionsData = JSON.parse(data);
      
      // 檢查數據是否太舊（超過7天）
      const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - sessionsData.timestamp > SEVEN_DAYS) {
        console.log('🗑️ Session backup is older than 7 days, deleting...');
        fs.unlinkSync(filePath); // 刪除過期文件
        return;
      }
      
      // 恢復會話數據
      this.activeSessions = new Map(sessionsData.activeSessions);
      this.tokenToUser = new Map(sessionsData.tokenToUser);
      
      console.log(`📥 Restored ${this.activeSessions.size} sessions from backup`);
      console.log(`🔍 Restored token mappings:`);
      Array.from(this.tokenToUser.entries()).forEach(([tok, uid], index) => {
        const tokPrefix = tok.substring(0, 6);
        const tokSuffix = tok.substring(tok.length - 6);
        console.log(`   ${index + 1}. User ${uid}: ${tokPrefix}...${tokSuffix}`);
      });
      
    } catch (error) {
      // 靜默處理載入錯誤，不影響主要功能
      console.warn('❌ Failed to load sessions from storage:', error.message);
    }
  }
}