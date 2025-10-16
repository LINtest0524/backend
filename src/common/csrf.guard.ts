import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    
    // 開發階段的簡單 CSRF 保護
    // 檢查請求是否包含有效的 timestamp 和 nonce
    const csrfToken = request.headers['x-csrf-token'] as string;
    const origin = request.headers.origin;
    const referer = request.headers.referer;
    
    // 檢查 Origin 和 Referer 是否來自允許的域名
    const allowedOrigins = ['http://localhost:3000', 'http://localhost:3002'];
    
    if (!origin || !allowedOrigins.includes(origin)) {
      throw new ForbiddenException('Invalid origin');
    }
    
    if (!referer || !allowedOrigins.some(allowed => referer.startsWith(allowed))) {
      throw new ForbiddenException('Invalid referer');
    }
    
    // 檢查 CSRF token（簡單的時間戳驗證）
    if (!csrfToken) {
      throw new ForbiddenException('CSRF token missing');
    }
    
    try {
      const tokenData = JSON.parse(Buffer.from(csrfToken, 'base64').toString());
      const { timestamp, nonce } = tokenData;
      
      // 檢查時間戳是否在合理範圍內（5分鐘）
      const now = Date.now();
      const tokenTime = parseInt(timestamp);
      
      if (now - tokenTime > 5 * 60 * 1000) {
        throw new ForbiddenException('CSRF token expired');
      }
      
      // 簡單的 nonce 驗證
      if (!nonce || nonce.length < 8) {
        throw new ForbiddenException('Invalid CSRF token');
      }
      
      return true;
    } catch (error) {
      throw new ForbiddenException('Invalid CSRF token format');
    }
  }
}