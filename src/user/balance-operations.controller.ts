import { 
  Controller, 
  Post, 
  Body, 
  UseGuards, 
  Request, 
  Param, 
  ParseIntPipe,
  BadRequestException,
  NotFoundException
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserService } from './user.service';
import { AuditLogService } from '../audit-log/audit-log.service';

interface BalanceOperationDto {
  operationType: 'ADD' | 'DEDUCT' | 'ADJUST';
  amount: number;
  reason?: string;
}

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER')
export class BalanceOperationsController {
  constructor(
    private readonly userService: UserService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // 獲取並標準化客戶端 IP 地址（與後台登入紀錄一致）
  private getClientIP(req: any): string {
    const ip = req.headers['x-forwarded-for'] ||
      req.ip ||
      req.socket?.remoteAddress ||
      'unknown';
    
    return this.normalizeIP(ip);
  }

  // 統一 IP 格式的輔助函數（與 auth.controller.ts 一致）
  private normalizeIP(ip: string): string {
    if (ip === '::1' || ip === '::ffff:127.0.0.1' || ip === '127.0.0.1') {
      return '127.0.0.1'; // 統一顯示為 IPv4 localhost
    }
    // 處理其他 IPv6 mapped IPv4 地址
    if (ip.startsWith('::ffff:')) {
      return ip.substring(7); // 移除 ::ffff: 前綴
    }
    return ip;
  }

  @Post(':userId/balance-operation')
  async performBalanceOperation(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: BalanceOperationDto,
    @Request() req: any,
  ) {
    const { operationType, amount, reason } = dto;
    const operatorUser = req.user;

    // 驗證輸入
    if (!['ADD', 'DEDUCT', 'ADJUST'].includes(operationType)) {
      throw new BadRequestException('無效的操作類型');
    }

    if (!amount || amount <= 0) {
      throw new BadRequestException('金額必須大於 0');
    }

    // 金額直接使用（台灣使用整數元，無小數點）
    const amountInInteger = Math.round(amount);

    // 獲取目標用戶
    const targetUser = await this.userService.findById(userId);
    if (!targetUser) {
      throw new NotFoundException('找不到指定的用戶');
    }

    // 記錄操作前的餘額
    const beforeBalance = targetUser.balance || 0;

    // 計算操作後的餘額
    let afterBalance: number;
    switch (operationType) {
      case 'ADD':
        afterBalance = beforeBalance + amountInInteger;
        break;
      case 'DEDUCT':
        if (beforeBalance < amountInInteger) {
          throw new BadRequestException('餘額不足，無法執行扣款操作');
        }
        afterBalance = beforeBalance - amountInInteger;
        break;
      case 'ADJUST':
        afterBalance = amountInInteger;
        break;
    }

    try {
      // 計算要變動的金額
      let changeAmount: number;
      switch (operationType) {
        case 'ADD':
          changeAmount = amountInInteger;
          break;
        case 'DEDUCT':
          changeAmount = -amountInInteger;
          break;
        case 'ADJUST':
          changeAmount = amountInInteger - beforeBalance;
          break;
      }

      // 使用現有的 updateBalance 方法（它已包含 audit log 記錄）
      const result = await this.userService.updateBalance(
        userId,
        changeAmount,
        reason || `${operationType === 'ADD' ? '存款' : operationType === 'DEDUCT' ? '扣款' : '調整'}操作`,
        {
          sub: operatorUser.sub,
          username: operatorUser.username,
          role: operatorUser.role,
        } as any,
        this.getClientIP(req),
        req.get('User-Agent') || 'unknown'
      );

      return {
        success: true,
        message: '餘額操作完成',
        data: {
          userId,
          username: targetUser.username,
          operationType,
          amount: amountInInteger,
          beforeBalance: result.oldBalance,
          afterBalance: result.newBalance,
          reason,
        },
      };
    } catch (error) {
      console.error('餘額操作失敗:', error);
      if (error.message) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('餘額操作失敗，請稍後再試');
    }
  }

  @Post(':userId/balance-history')
  async getBalanceHistory(
    @Param('userId', ParseIntPipe) userId: number,
    @Request() req: any,
  ) {
    // 獲取該用戶的所有餘額操作記錄
    const logs = await this.auditLogService.findFiltered({
      currentUser: req.user,
      target: `User:${userId}`,
      search: 'BALANCE_',
      page: 1,
      limit: 50,
    });

    return {
      success: true,
      data: logs.data,
      totalCount: logs.totalCount,
    };
  }
}