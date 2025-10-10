import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
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
}