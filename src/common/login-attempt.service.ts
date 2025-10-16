import { Injectable } from '@nestjs/common';

interface LoginAttempt {
  count: number;
  lastAttempt: number;
  blockedUntil?: number;
}

@Injectable()
export class LoginAttemptService {
  // 使用記憶體存儲，實際部署時可以改用 Redis
  private attempts: Map<string, LoginAttempt> = new Map();
  
  // 設定參數
  private readonly MAX_ATTEMPTS = 5;
  private readonly BLOCK_TIME = 15 * 60 * 1000; // 15分鐘
  private readonly ATTEMPT_WINDOW = 30 * 60 * 1000; // 30分鐘重置計數
  
  // 檢查是否被封鎖
  isBlocked(identifier: string): boolean {
    const attempt = this.attempts.get(identifier);
    if (!attempt) return false;
    
    // 檢查封鎖期是否已過
    if (attempt.blockedUntil && Date.now() < attempt.blockedUntil) {
      return true;
    }
    
    // 封鎖期已過，重置計數
    if (attempt.blockedUntil && Date.now() >= attempt.blockedUntil) {
      this.attempts.delete(identifier);
      return false;
    }
    
    return false;
  }
  
  // 記錄失敗嘗試
  recordFailedAttempt(identifier: string): void {
    const now = Date.now();
    const attempt = this.attempts.get(identifier);
    
    if (!attempt) {
      // 第一次失敗
      this.attempts.set(identifier, {
        count: 1,
        lastAttempt: now
      });
      return;
    }
    
    // 檢查是否超過時間窗口，如果是則重置計數
    if (now - attempt.lastAttempt > this.ATTEMPT_WINDOW) {
      this.attempts.set(identifier, {
        count: 1,
        lastAttempt: now
      });
      return;
    }
    
    // 增加失敗次數
    const newCount = attempt.count + 1;
    
    if (newCount >= this.MAX_ATTEMPTS) {
      // 達到最大嘗試次數，封鎖帳號
      this.attempts.set(identifier, {
        count: newCount,
        lastAttempt: now,
        blockedUntil: now + this.BLOCK_TIME
      });
    } else {
      this.attempts.set(identifier, {
        count: newCount,
        lastAttempt: now
      });
    }
  }
  
  // 成功登入時清除記錄
  clearAttempts(identifier: string): void {
    this.attempts.delete(identifier);
  }
  
  // 獲取剩餘封鎖時間（分鐘）
  getBlockedTimeRemaining(identifier: string): number {
    const attempt = this.attempts.get(identifier);
    if (!attempt || !attempt.blockedUntil) return 0;
    
    const remaining = attempt.blockedUntil - Date.now();
    return Math.ceil(remaining / (1000 * 60)); // 轉換為分鐘
  }
  
  // 清理過期記錄（定期執行）
  cleanup(): void {
    const now = Date.now();
    for (const [key, attempt] of this.attempts.entries()) {
      // 清理超過24小時的記錄
      if (now - attempt.lastAttempt > 24 * 60 * 60 * 1000) {
        this.attempts.delete(key);
      }
    }
  }
}