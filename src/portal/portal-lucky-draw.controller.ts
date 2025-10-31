import { Controller, Get, Post, Body, Param, Query, Req, ParseIntPipe, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LuckyPrizeService } from '../lucky-draw/lucky-prize.service';

@Controller('api/portal/:company/lucky-draw')
@UseGuards(JwtAuthGuard) // 只需要 JWT 驗證，不需要角色檢查
export class PortalLuckyDrawController {
  constructor(private readonly luckyPrizeService: LuckyPrizeService) {}

  /**
   * 獲取當前活動的獎品列表
   */
  @Get('active-event')
  async getActiveEvent(@Param('company') company: string, @Query('companyId') companyId?: number) {
    // 如果沒有傳入 companyId，可以根據公司代碼查詢
    return this.luckyPrizeService.findByActiveEvent(companyId);
  }

  /**
   * 執行抽獎
   */
  @Post('draw')
  async drawPrize(
    @Param('company') company: string,
    @Body() body: { userId?: number; companyId?: number },
    @Req() req: Request
  ) {
    const userIp = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    
    return this.luckyPrizeService.drawPrize(body.userId, body.companyId, userIp, userAgent);
  }

  /**
   * 獲取用戶抽獎歷史
   */
  @Get('history/:userId')
  async getUserDrawHistory(
    @Param('company') company: string,
    @Param('userId', ParseIntPipe) userId: number,
    @Query('companyId') companyId?: number
  ) {
    return this.luckyPrizeService.getUserDrawHistory(userId, companyId);
  }
}