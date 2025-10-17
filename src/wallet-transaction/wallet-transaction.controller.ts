import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { WalletTransactionService } from './wallet-transaction.service';

@Controller('wallet-transactions')
@UseGuards(JwtAuthGuard)
export class WalletTransactionController {
  constructor(private walletTransactionService: WalletTransactionService) {}

  /**
   * 獲取當前用戶的錢包交易記錄
   */
  @Get('my-transactions')
  async getMyTransactions(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('days') days?: string, // 獲取多少天內的記錄，預設30天
  ) {
    const userId = req.user.id;
    const companyId = req.user.company_id;
    
    // 設定預設值
    const limitNum = limit ? parseInt(limit) : 100;
    const offsetNum = offset ? parseInt(offset) : 0;
    const daysNum = days ? parseInt(days) : 30;
    
    // 計算日期範圍 (最近 daysNum 天)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);
    
    return this.walletTransactionService.getUserTransactions(
      userId,
      companyId,
      limitNum,
      offsetNum,
      startDate,
      endDate
    );
  }

  /**
   * 獲取當前用戶的錢包交易統計
   */
  @Get('my-stats')
  async getMyStats(
    @Req() req: any,
    @Query('days') days?: string,
  ) {
    const userId = req.user.id;
    const companyId = req.user.company_id;
    
    const daysNum = days ? parseInt(days) : 30;
    
    // 計算日期範圍 (最近 daysNum 天)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);
    
    return this.walletTransactionService.getUserTransactionStats(
      userId,
      companyId,
      startDate,
      endDate
    );
  }

  /**
   * 獲取所有用戶的錢包交易記錄（管理員用）
   */
  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER')
  async getAllTransactions(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('transactionType') transactionType?: string,
    @Query('user') user?: string,
    @Query('search') search?: string,
    @Query('minAmount') minAmount?: string,
    @Query('maxAmount') maxAmount?: string,
  ) {
    const companyId = req.user.company_id;
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 20;
    
    // 處理日期範圍
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    
    if (from) {
      startDate = new Date(from);
      startDate.setHours(0, 0, 0, 0);
    }
    
    if (to) {
      endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
    }
    
    // 處理用戶搜尋
    let userId: number | undefined;
    if (user) {
      // 這裡可以根據用戶名搜尋用戶ID，暫時先當作ID處理
      const userIdNum = parseInt(user);
      if (!isNaN(userIdNum)) {
        userId = userIdNum;
      }
    }
    
    const result = await this.walletTransactionService.getAllTransactions(
      companyId,
      pageNum,
      limitNum,
      startDate,
      endDate,
      transactionType,
      userId
    );
    
    return result;
  }
}