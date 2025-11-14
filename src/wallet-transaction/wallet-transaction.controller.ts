import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RequirePermission } from '../auth/permission.decorator';
import { WalletTransactionService } from './wallet-transaction.service';

@Controller('wallet-transactions')
export class WalletTransactionController {
  constructor(private walletTransactionService: WalletTransactionService) {}

  /**
   * 獲取當前用戶的錢包交易記錄
   */
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
  @RequirePermission('finance.admin')
  @Get('admin/all')
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
    
    // 處理金額範圍
    let minAmountNum: number | undefined;
    let maxAmountNum: number | undefined;
    
    if (minAmount && !isNaN(parseFloat(minAmount))) {
      minAmountNum = parseFloat(minAmount);
    }
    
    if (maxAmount && !isNaN(parseFloat(maxAmount))) {
      maxAmountNum = parseFloat(maxAmount);
    }
    
    const result = await this.walletTransactionService.getAllTransactions(
      companyId,
      pageNum,
      limitNum,
      startDate,
      endDate,
      transactionType,
      undefined, // userId - 不使用ID直接搜尋，改用用戶名搜尋
      search,
      minAmountNum,
      maxAmountNum,
      user
    );
    
    return result;
  }

  /**
   * 獲取管理員存扣款操作記錄
   */
  @RequirePermission('finance.admin')
  @Get()
  async getBalanceOperations(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('type') type?: string,
    @Query('transactionType') transactionType?: string,
    @Query('operator') operator?: string,
    @Query('targetUser') targetUser?: string,
    @Query('search') search?: string,
  ) {
    // 只查詢管理員操作的記錄
    if (type === 'admin_operations') {
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
      
      const result = await this.walletTransactionService.getAdminOperations(
        companyId,
        pageNum,
        limitNum,
        startDate,
        endDate,
        transactionType,
        operator,
        targetUser,
        search
      );
      
      return result;
    }
    
    // 如果不是管理員操作查詢，返回空結果
    return {
      data: [],
      totalCount: 0,
      totalPages: 0,
    };
  }
}